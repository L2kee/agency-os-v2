-- Agency OS: organizations (multi tenant foundation), 2026-11-21.
--
-- Every business that uses Agency OS is an organization. Every row in every
-- table belongs to exactly one organization, and row security lets a user see
-- only the rows of organizations they are an active member of. EVOGENCY is
-- the first organization on an existing install.
--
-- Inserts that don't set organization_id (the evogencyglobal.com lead form and
-- site chat insert with only user_id) get it filled from that user's
-- organization by a trigger, so existing writers keep working unchanged.
--
-- Child rows reference their parent through (organization_id, parent_id)
-- composite keys, so the database itself refuses a row that points at another
-- organization's data.
--
-- Run after 0005_access.sql (0006 is the separate Listing Suite tables).

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table if not exists public.organizations (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null check (char_length(name) between 1 and 120),
  slug                text unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  -- Shapes defaults later (pipeline stages, catalog starters): agency, home_service, other.
  industry            text not null default 'other',
  timezone            text not null default 'America/New_York',
  currency            text not null default 'usd' check (currency ~ '^[a-z]{3}$'),
  -- The organization that runs the platform (EVOGENCY). Only it may take
  -- payments through the platform's own Stripe account.
  is_platform         boolean not null default false,
  -- Phase 5. Stripe Connect account the organization collects payments into.
  stripe_account_id   text,
  -- Phase 5. Subscription to Agency OS itself.
  plan                text not null default 'internal',
  subscription_status text,
  -- Next deal number handed out by assign_deal_number() (0008).
  deal_seq            integer not null default 1000,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create table if not exists public.organization_members (
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id         uuid not null references auth.users (id) on delete cascade,
  role            text not null default 'member' check (role in ('owner', 'admin', 'member')),
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create index if not exists organization_members_user_idx
  on public.organization_members (user_id);

drop trigger if exists organizations_set_updated_at on public.organizations;
create trigger organizations_set_updated_at
  before update on public.organizations
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Membership helpers. Security definer so policies can call them without
-- recursing into organization_members' own policies. Empty search_path so a
-- caller can't shadow a table with their own schema.
-- ---------------------------------------------------------------------------
create or replace function public.is_org_member(org uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_members m
    join public.profiles p on p.id = m.user_id
    where m.organization_id = org
      and m.user_id = auth.uid()
      and m.is_active
      and p.is_active
  );
$$;

create or replace function public.is_org_admin(org uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_members m
    join public.profiles p on p.id = m.user_id
    where m.organization_id = org
      and m.user_id = auth.uid()
      and m.is_active
      and p.is_active
      and m.role in ('owner', 'admin')
  );
$$;

-- The organization a user's unscoped inserts land in: their oldest active
-- membership. Users belong to one organization for now. The app passes
-- organization_id explicitly on new tables, so this only matters for
-- writers that don't (the website, older code paths).
create or replace function public.default_org_for(uid uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select m.organization_id
  from public.organization_members m
  where m.user_id = uid and m.is_active
  order by m.created_at, m.organization_id
  limit 1;
$$;

create or replace function public.fill_organization_id()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.organization_id is null then
    new.organization_id := public.default_org_for(coalesce(new.user_id, auth.uid()));
  end if;
  return new;
end;
$$;

revoke execute on function public.is_org_member(uuid) from public, anon;
revoke execute on function public.is_org_admin(uuid) from public, anon;
revoke execute on function public.default_org_for(uuid) from public, anon;
grant execute on function public.is_org_member(uuid) to authenticated, service_role;
grant execute on function public.is_org_admin(uuid) to authenticated, service_role;
grant execute on function public.default_org_for(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Backfill an existing install: one organization (EVOGENCY) holding every
-- current user. Skipped on a fresh database with no users.
-- ---------------------------------------------------------------------------
do $$
declare
  org uuid;
  first_admin uuid;
begin
  if not exists (select 1 from public.profiles) then
    return;
  end if;

  select id into org from public.organizations where slug = 'evogency';
  if org is null then
    insert into public.organizations (name, slug, industry, is_platform)
    values ('EVOGENCY', 'evogency', 'agency', true)
    returning id into org;
  end if;

  select id into first_admin
  from public.profiles
  where role = 'admin'
  order by created_at, id
  limit 1;

  insert into public.organization_members (organization_id, user_id, role, is_active, created_at)
  select org,
         p.id,
         case
           when p.id = first_admin then 'owner'
           when p.role = 'admin' then 'admin'
           else 'member'
         end,
         p.is_active,
         p.created_at
  from public.profiles p
  on conflict (organization_id, user_id) do nothing;
end $$;

-- ---------------------------------------------------------------------------
-- organization_id on every existing table, backfilled, then required.
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'leads', 'activities', 'email_templates', 'sequences', 'sequence_steps',
    'sequence_enrollments', 'email_messages', 'call_logs', 'playbook_notes',
    'sending_accounts'
  ]
  loop
    execute format(
      'alter table public.%I add column if not exists organization_id uuid
         references public.organizations (id) on delete cascade', t);
    execute format(
      'update public.%I set organization_id = public.default_org_for(user_id)
         where organization_id is null', t);
    execute format('alter table public.%I alter column organization_id set not null', t);
    execute format('create index if not exists %I on public.%I (organization_id)', t || '_org_idx', t);
    execute format('drop trigger if exists fill_organization_id on public.%I', t);
    execute format(
      'create trigger fill_organization_id before insert on public.%I
         for each row execute function public.fill_organization_id()', t);
  end loop;
end $$;

-- Parents expose (organization_id, id) so children can reference both. Added
-- only when missing, because the child keys below depend on them.
do $$
declare
  t text;
begin
  foreach t in array array['leads', 'sequences', 'sequence_enrollments']
  loop
    if not exists (
      select 1 from pg_constraint
      where conname = t || '_org_id_key' and conrelid = format('public.%I', t)::regclass
    ) then
      execute format(
        'alter table public.%I add constraint %I unique (organization_id, id)', t, t || '_org_id_key');
    end if;
  end loop;
end $$;

-- Children: replace the single column foreign keys with same organization ones.
alter table public.activities drop constraint if exists activities_lead_id_fkey;
alter table public.activities drop constraint if exists activities_org_lead_fkey;
alter table public.activities add constraint activities_org_lead_fkey
  foreign key (organization_id, lead_id) references public.leads (organization_id, id)
  on delete cascade;

alter table public.call_logs drop constraint if exists call_logs_lead_id_fkey;
alter table public.call_logs drop constraint if exists call_logs_org_lead_fkey;
alter table public.call_logs add constraint call_logs_org_lead_fkey
  foreign key (organization_id, lead_id) references public.leads (organization_id, id)
  on delete cascade;

alter table public.sequence_steps drop constraint if exists sequence_steps_sequence_id_fkey;
alter table public.sequence_steps drop constraint if exists sequence_steps_org_sequence_fkey;
alter table public.sequence_steps add constraint sequence_steps_org_sequence_fkey
  foreign key (organization_id, sequence_id) references public.sequences (organization_id, id)
  on delete cascade;

alter table public.sequence_enrollments drop constraint if exists sequence_enrollments_lead_id_fkey;
alter table public.sequence_enrollments drop constraint if exists sequence_enrollments_sequence_id_fkey;
alter table public.sequence_enrollments drop constraint if exists sequence_enrollments_org_lead_fkey;
alter table public.sequence_enrollments drop constraint if exists sequence_enrollments_org_sequence_fkey;
alter table public.sequence_enrollments add constraint sequence_enrollments_org_lead_fkey
  foreign key (organization_id, lead_id) references public.leads (organization_id, id)
  on delete cascade;
alter table public.sequence_enrollments add constraint sequence_enrollments_org_sequence_fkey
  foreign key (organization_id, sequence_id) references public.sequences (organization_id, id)
  on delete cascade;

alter table public.email_messages drop constraint if exists email_messages_lead_id_fkey;
alter table public.email_messages drop constraint if exists email_messages_enrollment_id_fkey;
alter table public.email_messages drop constraint if exists email_messages_org_lead_fkey;
alter table public.email_messages drop constraint if exists email_messages_org_enrollment_fkey;
alter table public.email_messages add constraint email_messages_org_lead_fkey
  foreign key (organization_id, lead_id) references public.leads (organization_id, id)
  on delete cascade;
alter table public.email_messages add constraint email_messages_org_enrollment_fkey
  foreign key (organization_id, enrollment_id)
  references public.sequence_enrollments (organization_id, id)
  on delete set null (enrollment_id);

-- Google Places dedupe is per organization now, not per user.
drop index if exists public.leads_user_place_idx;
create unique index if not exists leads_org_place_idx
  on public.leads (organization_id, place_id) where place_id is not null;

-- Every table's user_id cascades on user delete, which was fine when rows
-- were private but would wipe shared team data now. Before a member is
-- removed, the Access page hands their shared rows in that organization to
-- the admin doing the removal and drops their personal ones. Service role only.
create or replace function public.transfer_member_rows(p_org uuid, p_from uuid, p_to uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  t text;
begin
  if not exists (
    select 1 from public.organization_members
    where organization_id = p_org and user_id = p_to and is_active
  ) then
    raise exception 'The new owner must be an active member of the organization';
  end if;

  -- Every table with both columns, so tables added later are covered too.
  for t in
    select c.table_name
    from information_schema.columns c
    join information_schema.columns o
      on o.table_schema = c.table_schema
     and o.table_name = c.table_name
     and o.column_name = 'organization_id'
    where c.table_schema = 'public'
      and c.column_name = 'user_id'
      and c.table_name not in ('playbook_notes', 'sending_accounts', 'organization_members')
  loop
    execute format(
      'update public.%I set user_id = $1 where organization_id = $2 and user_id = $3', t)
      using p_to, p_org, p_from;
  end loop;

  delete from public.playbook_notes where organization_id = p_org and user_id = p_from;
  delete from public.sending_accounts where organization_id = p_org and user_id = p_from;
end;
$$;

revoke execute on function public.transfer_member_rows(uuid, uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.transfer_member_rows(uuid, uuid, uuid) to service_role;

-- ---------------------------------------------------------------------------
-- Row security
-- ---------------------------------------------------------------------------
-- Shared within the organization: the sales data the whole team works.
do $$
declare
  t text;
begin
  foreach t in array array[
    'leads', 'activities', 'email_templates', 'sequences', 'sequence_steps',
    'sequence_enrollments', 'email_messages', 'call_logs'
  ]
  loop
    execute format('drop policy if exists "own rows" on public.%I', t);
    execute format('drop policy if exists "own leads" on public.%I', t);
    execute format('drop policy if exists "own activities" on public.%I', t);
    execute format('drop policy if exists "org rows" on public.%I', t);
    execute format(
      'create policy "org rows" on public.%I for all to authenticated
         using (public.is_org_member(organization_id))
         with check (public.is_org_member(organization_id))', t);
  end loop;
end $$;

-- Personal: a user's own playbook notes and their encrypted sending key.
do $$
declare
  t text;
begin
  foreach t in array array['playbook_notes', 'sending_accounts']
  loop
    execute format('drop policy if exists "own rows" on public.%I', t);
    execute format(
      'create policy "own rows" on public.%I for all to authenticated
         using (auth.uid() = user_id and public.is_org_member(organization_id))
         with check (auth.uid() = user_id and public.is_org_member(organization_id))', t);
  end loop;
end $$;

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;

drop policy if exists "members read" on public.organizations;
create policy "members read" on public.organizations
  for select to authenticated using (public.is_org_member(id));

-- Admins rename their organization and set its timezone. Billing, platform,
-- and Stripe columns are changed only by server code with the service role.
drop policy if exists "admins update" on public.organizations;
create policy "admins update" on public.organizations
  for update to authenticated
  using (public.is_org_admin(id)) with check (public.is_org_admin(id));
revoke update on public.organizations from authenticated;
grant update (name, timezone) on public.organizations to authenticated;

-- Members see who else is on their team. Membership changes go through the
-- Access page's server actions (service role), never the browser.
drop policy if exists "members read" on public.organization_members;
create policy "members read" on public.organization_members
  for select to authenticated using (public.is_org_member(organization_id));

-- Profiles: your own, plus teammates in any organization you share.
drop policy if exists "read own or admin" on public.profiles;
drop policy if exists "admin updates" on public.profiles;
drop policy if exists "read own or teammates" on public.profiles;
create policy "read own or teammates" on public.profiles
  for select to authenticated
  using (
    id = auth.uid()
    or exists (
      select 1 from public.organization_members m
      where m.user_id = profiles.id and public.is_org_member(m.organization_id)
    )
  );
