-- Agency OS — Phase 4: per-user email sending accounts
-- Run in the Supabase SQL editor after 0003_calling.sql.
--
-- Each user configures how THEIR outreach goes out: their own Resend API key +
-- from-address today, and (later) a connected Gmail/Outlook account. The secret
-- (API key / OAuth refresh token) is stored AES-256-GCM encrypted by the app
-- using APP_ENCRYPTION_KEY — Postgres only ever sees ciphertext.

create table if not exists public.sending_accounts (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users (id) on delete cascade,
  provider         text not null default 'resend',   -- resend | gmail | microsoft | smtp
  from_email       text not null,
  from_name        text not null default '',
  secret_encrypted text,                             -- encrypted API key / refresh token
  status           text not null default 'unverified', -- unverified | active | needs_auth
  last_error       text,
  last_verified_at timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- One sending account per user for now. Drop this to allow multiple later.
create unique index if not exists sending_accounts_user_idx
  on public.sending_accounts (user_id);

drop trigger if exists sending_accounts_set_updated_at on public.sending_accounts;
create trigger sending_accounts_set_updated_at
  before update on public.sending_accounts
  for each row execute function public.set_updated_at();

alter table public.sending_accounts enable row level security;

drop policy if exists "own rows" on public.sending_accounts;
create policy "own rows" on public.sending_accounts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
