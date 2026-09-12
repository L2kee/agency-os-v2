-- Agency OS — Phase 3: cold-calling playbook + call logging
-- Run in the Supabase SQL editor after 0002_outreach.sql.

-- Structured record of every call attempt (activities still get a timeline entry too).
create table if not exists public.call_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  lead_id     uuid not null references public.leads (id) on delete cascade,
  outcome     text not null,            -- see CALL_OUTCOMES in src/lib/playbook.ts
  notes       text,
  created_at  timestamptz not null default now()
);

create index if not exists call_logs_lead_idx on public.call_logs (lead_id, created_at desc);
create index if not exists call_logs_user_idx on public.call_logs (user_id, created_at desc);

-- Personal notes the user pins to a playbook item ("this line worked", tweaks).
create table if not exists public.playbook_notes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  item_key    text not null,            -- matches a key in src/lib/playbook.ts
  note        text not null default '',
  updated_at  timestamptz not null default now()
);

create unique index if not exists playbook_notes_user_item_idx
  on public.playbook_notes (user_id, item_key);

drop trigger if exists playbook_notes_set_updated_at on public.playbook_notes;
create trigger playbook_notes_set_updated_at
  before update on public.playbook_notes
  for each row execute function public.set_updated_at();

-- When to call this lead back.
alter table public.leads add column if not exists next_follow_up_at timestamptz;
create index if not exists leads_follow_up_idx
  on public.leads (user_id, next_follow_up_at) where next_follow_up_at is not null;

-- RLS
alter table public.call_logs      enable row level security;
alter table public.playbook_notes enable row level security;

do $$
declare t text;
begin
  foreach t in array array['call_logs','playbook_notes']
  loop
    execute format('drop policy if exists "own rows" on public.%I', t);
    execute format(
      'create policy "own rows" on public.%I for all
         using (auth.uid() = user_id) with check (auth.uid() = user_id)', t);
  end loop;
end $$;
