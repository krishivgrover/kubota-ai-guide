
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TABLE public.tractors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  hp NUMERIC(5,1) NOT NULL,
  fuel_type TEXT NOT NULL DEFAULT 'diesel',
  price_inr NUMERIC(12,2),
  use_cases TEXT[] NOT NULL DEFAULT '{}',
  description TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (brand, model)
);
GRANT SELECT ON public.tractors TO anon, authenticated;
GRANT ALL ON public.tractors TO service_role;
ALTER TABLE public.tractors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tractors readable by all" ON public.tractors FOR SELECT USING (true);
CREATE POLICY "tractors admin write" ON public.tractors FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.dealers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL, region TEXT NOT NULL, city TEXT NOT NULL,
  address TEXT, phone TEXT, email TEXT,
  latitude NUMERIC(9,6), longitude NUMERIC(9,6),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.dealers TO anon, authenticated;
GRANT ALL ON public.dealers TO service_role;
ALTER TABLE public.dealers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dealers readable by all" ON public.dealers FOR SELECT USING (true);
CREATE POLICY "dealers admin write" ON public.dealers FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.warranties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tractor_id UUID REFERENCES public.tractors(id) ON DELETE SET NULL,
  serial_number TEXT NOT NULL,
  purchase_date DATE NOT NULL,
  warranty_end DATE NOT NULL,
  coverage TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.warranties TO authenticated;
GRANT ALL ON public.warranties TO service_role;
ALTER TABLE public.warranties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "warranties owner read" ON public.warranties FOR SELECT TO authenticated
  USING (customer_id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "warranties owner insert" ON public.warranties FOR INSERT TO authenticated
  WITH CHECK (customer_id = auth.uid());
CREATE POLICY "warranties owner update" ON public.warranties FOR UPDATE TO authenticated
  USING (customer_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (customer_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "warranties admin delete" ON public.warranties FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.maintenance_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tractor_id UUID NOT NULL REFERENCES public.tractors(id) ON DELETE CASCADE,
  interval_hours INT NOT NULL,
  task TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'routine',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.maintenance_schedules TO anon, authenticated;
GRANT ALL ON public.maintenance_schedules TO service_role;
ALTER TABLE public.maintenance_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "maintenance readable by all" ON public.maintenance_schedules FOR SELECT USING (true);
CREATE POLICY "maintenance admin write" ON public.maintenance_schedules FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_tractors_upd BEFORE UPDATE ON public.tractors FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_dealers_upd BEFORE UPDATE ON public.dealers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_warranties_upd BEFORE UPDATE ON public.warranties FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.tractors (brand, model, hp, price_inr, use_cases, description) VALUES
  ('Farmtrac', '45 Smart', 48, 720000, ARRAY['ploughing','haulage','general'], 'Balanced 48HP tractor for mid-size farms.'),
  ('Farmtrac', '60 Powermaxx', 55, 820000, ARRAY['ploughing','rotavator','haulage'], 'Powerful 55HP with high torque for heavy implements.'),
  ('Powertrac', 'Euro 50', 50, 780000, ARRAY['haulage','commercial','ploughing'], 'Fuel efficient 50HP workhorse.'),
  ('Powertrac', '439 Plus', 41, 620000, ARRAY['orchard','light-tillage'], 'Compact 41HP ideal for orchards and small plots.'),
  ('Kubota', 'MU4501', 45, 850000, ARRAY['ploughing','puddling','rice'], 'Kubota reliability for paddy and wet fields.'),
  ('Kubota', 'MU5502', 55, 980000, ARRAY['heavy-tillage','commercial'], 'Premium 55HP for demanding operations.');

INSERT INTO public.dealers (name, region, city, address, phone, latitude, longitude) VALUES
  ('Escorts Kubota Faridabad', 'North', 'Faridabad', 'Plot 115, Sector 13, Faridabad, Haryana', '+91-129-2250100', 28.4089, 77.3178),
  ('Escorts Kubota Ludhiana', 'North', 'Ludhiana', 'GT Road, Ludhiana, Punjab', '+91-161-4001200', 30.9010, 75.8573),
  ('Escorts Kubota Pune', 'West', 'Pune', 'Nagar Road, Pune, Maharashtra', '+91-20-27001300', 18.5679, 73.9143),
  ('Escorts Kubota Coimbatore', 'South', 'Coimbatore', 'Trichy Road, Coimbatore, TN', '+91-422-4001400', 11.0168, 76.9558),
  ('Escorts Kubota Patna', 'East', 'Patna', 'Bailey Road, Patna, Bihar', '+91-612-2001500', 25.6127, 85.1376),
  ('Escorts Kubota Indore', 'Central', 'Indore', 'AB Road, Indore, MP', '+91-731-4001600', 22.7196, 75.8577);

INSERT INTO public.maintenance_schedules (tractor_id, interval_hours, task, category, notes)
SELECT id, 50, 'Engine oil & filter change', 'routine', 'Use 15W40 grade oil.' FROM public.tractors WHERE brand='Farmtrac' AND model='60 Powermaxx'
UNION ALL SELECT id, 100, 'Air filter cleaning', 'routine', NULL FROM public.tractors WHERE brand='Farmtrac' AND model='60 Powermaxx'
UNION ALL SELECT id, 250, 'Hydraulic oil check', 'inspection', NULL FROM public.tractors WHERE brand='Farmtrac' AND model='60 Powermaxx'
UNION ALL SELECT id, 500, 'Fuel filter replacement', 'replacement', NULL FROM public.tractors WHERE brand='Farmtrac' AND model='60 Powermaxx'
UNION ALL SELECT id, 1000, 'Full service inspection', 'major', 'Recommended at authorized dealer.' FROM public.tractors WHERE brand='Farmtrac' AND model='60 Powermaxx';

INSERT INTO public.maintenance_schedules (tractor_id, interval_hours, task, category)
SELECT t.id, s.interval_hours, s.task, s.category
FROM public.tractors t
CROSS JOIN (VALUES (50,'Engine oil & filter change','routine'),(100,'Air filter cleaning','routine'),(250,'Hydraulic oil check','inspection'),(500,'Fuel filter replacement','replacement'),(1000,'Full service inspection','major')) AS s(interval_hours, task, category)
WHERE NOT ((t.brand='Farmtrac') AND (t.model='60 Powermaxx'));
