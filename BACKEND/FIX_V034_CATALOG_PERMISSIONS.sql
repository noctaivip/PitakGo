-- PitakGo v0.34: public catalogs + permissions. Run ONCE in PitakGo Supabase SQL Editor.
-- Do not disable RLS and do not grant access to personal data.
begin;
grant usage on schema public to anon, authenticated;
grant select on table public.pitaks to anon, authenticated;
grant select on table public.location_catalog to anon, authenticated;
alter table public.pitaks enable row level security;
alter table public.location_catalog enable row level security;
drop policy if exists pitakgo_catalog_public_read on public.pitaks;
create policy pitakgo_catalog_public_read on public.pitaks for select to anon, authenticated using (true);
drop policy if exists pitakgo_locations_public_read on public.location_catalog;
create policy pitakgo_locations_public_read on public.location_catalog for select to anon, authenticated using (true);
-- Supabase security advisor reported this administrative SECURITY DEFINER RPC as public.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
commit;
-- Confirm grants and policies:
select grantee,table_name,privilege_type from information_schema.role_table_grants
 where table_schema='public' and table_name in ('pitaks','location_catalog') and grantee in ('anon','authenticated')
 order by table_name,grantee;
