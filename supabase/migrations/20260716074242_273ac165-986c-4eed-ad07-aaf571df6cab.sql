
-- 1) Restrict dealers to authenticated only
DROP POLICY IF EXISTS "dealers readable by all" ON public.dealers;
CREATE POLICY "dealers readable by authenticated" ON public.dealers
  FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.dealers FROM anon;

-- 2) Restrict documents/document_chunks read to staff only
DROP POLICY IF EXISTS "Authenticated read documents" ON public.documents;
CREATE POLICY "Staff read documents" ON public.documents
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Authenticated read chunks" ON public.document_chunks;
CREATE POLICY "Staff read chunks" ON public.document_chunks
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

-- 3) Lock down SECURITY DEFINER functions: revoke from PUBLIC/anon; grant back only where RLS/app needs it
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.log_appointment_status_change() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.match_document_chunks(vector, integer) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

REVOKE ALL ON FUNCTION public.is_staff(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_staff(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.can_access_ticket(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_access_ticket(uuid, uuid) TO authenticated;
