
-- Restrict full dealer rows (including email/phone) to staff only.
-- Provide a contact-free directory view for authenticated users.

DROP POLICY IF EXISTS "dealers readable by authenticated" ON public.dealers;
DROP POLICY IF EXISTS "dealers readable by staff" ON public.dealers;

CREATE POLICY "dealers readable by staff"
  ON public.dealers
  FOR SELECT
  TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE OR REPLACE VIEW public.dealers_directory
WITH (security_invoker = true) AS
SELECT id, name, region, city, address, latitude, longitude
FROM public.dealers;

GRANT SELECT ON public.dealers_directory TO authenticated;
