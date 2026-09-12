-- Agency OS — Phase 2: email outreach + sequences
-- Run this in the Supabase SQL editor after 0001_init.sql.

-- ---------------------------------------------------------------------------
-- email_templates: reusable subject/body with {{merge_fields}}
-- ---------------------------------------------------------------------------
create table if not exists public.email_templates (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  name        text not null,
  subject     text not null default '',
  body        text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- sequences + steps: a multi-touch follow-up cadence
-- ---------------------------------------------------------------------------
create table if not exists public.sequences (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  name        text not null,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

create table if not exists public.sequence_steps (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  sequence_id  uuid not null references public.sequences (id) on delete cascade,
  step_order   int not null default 1,
  day_offset   int not null default 0,   -- days after the previous step (0 = send immediately)
  subject      text not null default '',
  body         text not null default ''
);

create index if not exists sequence_steps_seq_idx
  on public.sequence_steps (sequence_id, step_order);

-- ---------------------------------------------------------------------------
-- sequence_enrollments: a lead moving through a sequence
-- ---------------------------------------------------------------------------
create table if not exists public.sequence_enrollments (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  lead_id       uuid not null references public.leads (id) on delete cascade,
  sequence_id   uuid not null references public.sequences (id) on delete cascade,
  status        text not null default 'active',  -- active | completed | stopped | replied
  current_step  int not null default 0,          -- number of steps already sent
  next_run_at   timestamptz,                     -- when the next step is due
  enrolled_at   timestamptz not null default now()
);

create index if not exists enrollments_due_idx
  on public.sequence_enrollments (status, next_run_at);
create unique index if not exists enrollments_lead_seq_idx
  on public.sequence_enrollments (lead_id, sequence_id);

-- ---------------------------------------------------------------------------
-- email_messages: every email we tried to send
-- ---------------------------------------------------------------------------
create table if not exists public.email_messages (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,
  lead_id        uuid not null references public.leads (id) on delete cascade,
  enrollment_id  uuid references public.sequence_enrollments (id) on delete set null,
  to_email       text not null,
  subject        text not null,
  body           text not null,
  status         text not null default 'queued', -- queued | sent | failed
  provider_id    text,
  error          text,
  opened_at      timestamptz,
  sent_at        timestamptz,
  created_at     timestamptz not null default now()
);

create index if not exists email_messages_lead_idx
  on public.email_messages (lead_id, created_at desc);

-- ---------------------------------------------------------------------------
-- updated_at trigger on templates
-- ---------------------------------------------------------------------------
drop trigger if exists email_templates_set_updated_at on public.email_templates;
create trigger email_templates_set_updated_at
  before update on public.email_templates
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.email_templates      enable row level security;
alter table public.sequences            enable row level security;
alter table public.sequence_steps       enable row level security;
alter table public.sequence_enrollments enable row level security;
alter table public.email_messages       enable row level security;

do $$
declare t text;
begin
  foreach t in array array[
    'email_templates','sequences','sequence_steps',
    'sequence_enrollments','email_messages'
  ]
  loop
    execute format('drop policy if exists "own rows" on public.%I', t);
    execute format(
      'create policy "own rows" on public.%I for all
         using (auth.uid() = user_id) with check (auth.uid() = user_id)', t);
  end loop;
end $$;
