-- Restrict manuals bucket read to staff only (aligns with documents/document_chunks access rules)
DROP POLICY IF EXISTS "manuals read authenticated" ON storage.objects;

CREATE POLICY "manuals read staff"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'manuals'
  AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'dealer'::public.app_role)
    OR public.has_role(auth.uid(), 'service_engineer'::public.app_role)
  )
);