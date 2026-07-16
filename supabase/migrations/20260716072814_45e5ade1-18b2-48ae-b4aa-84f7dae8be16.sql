
-- Enum for appointment status
DO $$ BEGIN
  CREATE TYPE public.appointment_status AS ENUM
    ('requested','confirmed','scheduled','in_progress','completed','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Appointments
CREATE TABLE public.service_appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tractor_id UUID REFERENCES public.tractors(id) ON DELETE SET NULL,
  dealer_id UUID REFERENCES public.dealers(id) ON DELETE SET NULL,
  engineer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  serial_number TEXT,
  service_type TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  address TEXT,
  notes TEXT,
  status public.appointment_status NOT NULL DEFAULT 'requested',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_appointments TO authenticated;
GRANT ALL ON public.service_appointments TO service_role;

ALTER TABLE public.service_appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "customers view own appointments"
  ON public.service_appointments FOR SELECT TO authenticated
  USING (customer_id = auth.uid() OR engineer_id = auth.uid() OR public.is_staff(auth.uid()));

CREATE POLICY "customers create own appointments"
  ON public.service_appointments FOR INSERT TO authenticated
  WITH CHECK (customer_id = auth.uid());

CREATE POLICY "customer or staff update"
  ON public.service_appointments FOR UPDATE TO authenticated
  USING (customer_id = auth.uid() OR engineer_id = auth.uid() OR public.is_staff(auth.uid()))
  WITH CHECK (customer_id = auth.uid() OR engineer_id = auth.uid() OR public.is_staff(auth.uid()));

CREATE POLICY "customer or staff delete"
  ON public.service_appointments FOR DELETE TO authenticated
  USING (customer_id = auth.uid() OR public.is_staff(auth.uid()));

CREATE INDEX idx_service_appointments_customer ON public.service_appointments(customer_id);
CREATE INDEX idx_service_appointments_engineer ON public.service_appointments(engineer_id);
CREATE INDEX idx_service_appointments_status ON public.service_appointments(status);

CREATE TRIGGER trg_service_appointments_updated
  BEFORE UPDATE ON public.service_appointments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Updates / status feed
CREATE TABLE public.service_appointment_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES public.service_appointments(id) ON DELETE CASCADE,
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status public.appointment_status,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.service_appointment_updates TO authenticated;
GRANT ALL ON public.service_appointment_updates TO service_role;

ALTER TABLE public.service_appointment_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "view updates for accessible appointments"
  ON public.service_appointment_updates FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.service_appointments a
    WHERE a.id = appointment_id
      AND (a.customer_id = auth.uid() OR a.engineer_id = auth.uid() OR public.is_staff(auth.uid()))
  ));

CREATE POLICY "post updates for accessible appointments"
  ON public.service_appointment_updates FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.service_appointments a
    WHERE a.id = appointment_id
      AND (a.customer_id = auth.uid() OR a.engineer_id = auth.uid() OR public.is_staff(auth.uid()))
  ));

CREATE INDEX idx_service_appointment_updates_appt ON public.service_appointment_updates(appointment_id, created_at);

-- Auto-log status change
CREATE OR REPLACE FUNCTION public.log_appointment_status_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.service_appointment_updates(appointment_id, author_id, status, message)
    VALUES (NEW.id, NEW.customer_id, NEW.status,
      'Appointment created for ' || to_char(NEW.scheduled_at, 'DD Mon YYYY HH24:MI') || ' — ' || NEW.service_type);
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.service_appointment_updates(appointment_id, author_id, status, message)
    VALUES (NEW.id, auth.uid(), NEW.status,
      'Status changed to ' || NEW.status::text);
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_service_appointments_log
  AFTER INSERT OR UPDATE OF status ON public.service_appointments
  FOR EACH ROW EXECUTE FUNCTION public.log_appointment_status_change();

-- Enable realtime for live status updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.service_appointments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.service_appointment_updates;
