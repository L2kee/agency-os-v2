-- Agency OS — initial schema
-- Run this in the Supabase SQL editor (Dashboard → SQL → New query) or via `supabase db push`.

-- ---------------------------------------------------------------------------
-- leads: a prospect business moving through the sales pipeline
-- ---------------------------------------------------------------------------
create table if not exists public.leads (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,

  business_name  text not null,
  contact_name   text,
  email          text,
  phone          text,
  website        text,
  address        text,
  city           text,
  state          text,
  category       text,                       -- e.g. "Plumber", "Dentist"

  source         text default 'manual',      -- manual | csv | google_places
  place_id       text,                       -- Google Places id, for dedupe

  stage          text not null default 'new',-- see STAGES in src/lib/pipeline.ts
  deal_value     numeric(12,2) default 1000, -- expected value of the project
  sort_order     double precision default 0, -- ordering within a stage column

  has_website    boolean,
  website_quality text,                      -- none | outdated | ok

  notes          text,

  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists leads_user_stage_idx on public.leads (user_id, stage);
create unique index if not exists leads_user_place_idx
  on public.leads (user_id, place_id) where place_id is not null;

-- ---------------------------------------------------------------------------
-- activities: a timeline entry against a lead
-- ---------------------------------------------------------------------------
create table if not exists public.activities (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  lead_id     uuid not null references public.leads (id) on delete cascade,
  type        text not null default 'note',  -- note | call | email | meeting | stage_change
  body        text not null,
  created_at  timestamptz not null default now()
);

create index if not exists activities_lead_idx on public.activities (lead_id, created_at desc);

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists leads_set_updated_at on public.leads;
create trigger leads_set_updated_at
  before update on public.leads
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security — every row is private to the user that created it
-- ---------------------------------------------------------------------------
alter table public.leads      enable row level security;
alter table public.activities enable row level security;

drop policy if exists "own leads" on public.leads;
create policy "own leads" on public.leads
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own activities" on public.activities;
create policy "own activities" on public.activities
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
