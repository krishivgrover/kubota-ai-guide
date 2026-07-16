
create policy "manuals read authenticated" on storage.objects
  for select to authenticated using (bucket_id = 'manuals');

create policy "manuals upload staff" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'manuals' and (
      public.has_role(auth.uid(),'admin')
      or public.has_role(auth.uid(),'dealer')
      or public.has_role(auth.uid(),'service_engineer')
    )
  );

create policy "manuals update staff" on storage.objects
  for update to authenticated using (
    bucket_id = 'manuals' and (
      public.has_role(auth.uid(),'admin')
      or public.has_role(auth.uid(),'dealer')
      or public.has_role(auth.uid(),'service_engineer')
    )
  );

create policy "manuals delete admin" on storage.objects
  for delete to authenticated using (
    bucket_id = 'manuals' and public.has_role(auth.uid(),'admin')
  );
