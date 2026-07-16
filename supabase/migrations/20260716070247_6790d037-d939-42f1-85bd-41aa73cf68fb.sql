
create extension if not exists vector;

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  storage_path text not null unique,
  source_type text not null default 'manual',
  page_count int,
  status text not null default 'pending',
  error text,
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update, delete on public.documents to authenticated;
grant all on public.documents to service_role;

alter table public.documents enable row level security;

create policy "Authenticated read documents" on public.documents
  for select to authenticated using (true);

create policy "Staff insert documents" on public.documents
  for insert to authenticated with check (
    public.has_role(auth.uid(),'admin')
    or public.has_role(auth.uid(),'dealer')
    or public.has_role(auth.uid(),'service_engineer')
  );

create policy "Staff update documents" on public.documents
  for update to authenticated using (
    public.has_role(auth.uid(),'admin')
    or public.has_role(auth.uid(),'dealer')
    or public.has_role(auth.uid(),'service_engineer')
  );

create policy "Admins delete documents" on public.documents
  for delete to authenticated using (public.has_role(auth.uid(),'admin'));

create trigger documents_updated_at before update on public.documents
  for each row execute function public.set_updated_at();

create table public.document_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  chunk_index int not null,
  content text not null,
  page int,
  token_count int,
  embedding vector(1536),
  created_at timestamptz not null default now()
);

grant select on public.document_chunks to authenticated;
grant all on public.document_chunks to service_role;

alter table public.document_chunks enable row level security;

create policy "Authenticated read chunks" on public.document_chunks
  for select to authenticated using (true);

create index document_chunks_document_id_idx on public.document_chunks(document_id);
create index document_chunks_embedding_idx on public.document_chunks
  using hnsw (embedding vector_cosine_ops);

create or replace function public.match_document_chunks(
  query_embedding vector(1536),
  match_count int default 6
) returns table (
  id uuid,
  document_id uuid,
  chunk_index int,
  content text,
  page int,
  similarity float
) language sql stable security definer set search_path = public as $$
  select c.id, c.document_id, c.chunk_index, c.content, c.page,
         1 - (c.embedding <=> query_embedding) as similarity
  from public.document_chunks c
  where c.embedding is not null
  order by c.embedding <=> query_embedding
  limit match_count;
$$;

grant execute on function public.match_document_chunks(vector, int) to authenticated, service_role;
