-- Agency OS — Phase 5: access control (invite-only + admin role)
-- Run in the Supabase SQL editor after 0004_sending_accounts.sql.
--
-- AFTER running this, also turn OFF public signups:
--   Supabase Dashboard → Authentication → Sign In / Providers → Email
--   → "Allow new users to sign up" = OFF
-- From then on, users are added only via the in-app Admin page (which uses the
-- service-role key to invite them by email).

create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  email      text,
  role       text not null default 'member',   -- member | admin
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);

-- Auto-create a profile whenever an auth user is created. The very first user
-- becomes an admin so you're never locked out.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  no_users boolean;
begin
  select count(*) = 0 into no_users from public.profiles;
  insert into public.profiles (id, email, role)
  values (new.id, new.email, case when no_users then 'admin' else 'member' end)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill: everyone who already has an account gets a profile; the oldest
-- account becomes the admin.
insert into public.profiles (id, email, role, created_at)
select u.id, u.email,
       case when u.id = (select id from auth.users order by created_at asc limit 1)
            then 'admin' else 'member' end,
       u.created_at
from auth.users u
on conflict (id) do nothing;

-- If you need to make a specific account the admin, run:
--   update public.profiles set role = 'admin' where email = 'you@example.com';

-- Helper used by RLS policies.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and is_active
  );
$$;

alter table public.profiles enable row level security;

drop policy if exists "read own or admin" on public.profiles;
create policy "read own or admin" on public.profiles
  for select using (id = auth.uid() or public.is_admin());

drop policy if exists "admin updates" on public.profiles;
create policy "admin updates" on public.profiles
  for update using (public.is_admin()) with check (public.is_admin());
