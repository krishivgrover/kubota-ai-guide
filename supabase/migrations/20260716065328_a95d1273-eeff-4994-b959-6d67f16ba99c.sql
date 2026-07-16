
-- Trigger functions never need to be callable directly by clients
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;

-- has_role is used inside RLS policies (which run in the DB engine).
-- Revoke direct execution from anon; keep authenticated so client-side
-- role checks via RPC still work if needed later.
revoke execute on function public.has_role(uuid, public.app_role) from public, anon;
grant execute on function public.has_role(uuid, public.app_role) to authenticated;
