-- Agency OS: sales system, 2026-11-21.
--
-- customers  A business or a person who has bought (or is buying) from the
--            organization. A homeowner is a customer of kind 'person'.
-- contacts   The people at a customer. A person customer usually has one.
-- products   The catalog (price book). Services and goods, one time or
--            recurring, each optionally mirrored in Stripe.
-- deals      A quote for a lead or customer, built from catalog line items,
--            with a Stripe payment link. Paying it marks the deal won and
--            turns the lead into a customer.
-- deal_items The lines on a deal. Name and price are copied from the catalog
--            when added, so a later price change never rewrites an old deal.
--
-- Later phases attach to these: the timeline (Phase 2) and tickets and jobs
-- (Phase 3) reference customers, contacts, and deals.
--
-- Money is stored in cents (bigint). Run after 0007_organizations.sql.

-- ---------------------------------------------------------------------------
-- customers and contacts
-- ---------------------------------------------------------------------------
create table if not exists public.customers (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id         uuid not null references auth.users (id) on delete cascade,
  kind            text not null default 'business' check (kind in ('business', 'person')),
  name            text not null check (char_length(name) between 1 and 200),
  email           text,
  phone           text,
  website         text,
  address_line1   text,
  address_line2   text,
  city            text,
  state           text,
  postal_code     text,
  country         text not null default 'US',
  status          text not null default 'active' check (status in ('active', 'former')),
  notes           text,
  source_lead_id  uuid,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (organization_id, id),
  foreign key (organization_id, source_lead_id)
    references public.leads (organization_id, id) on delete set null (source_lead_id)
);

create index if not exists customers_org_name_idx on public.customers (organization_id, name);

create table if not exists public.contacts (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id         uuid not null references auth.users (id) on delete cascade,
  customer_id     uuid not null,
  full_name       text not null check (char_length(full_name) between 1 and 200),
  email           text,
  phone           text,
  title           text,
  is_primary      boolean not null default false,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (organization_id, id),
  foreign key (organization_id, customer_id)
    references public.customers (organization_id, id) on delete cascade
);

create index if not exists contacts_customer_idx on public.contacts (customer_id);

-- A lead remembers the customer and contact it became.
alter table public.leads add column if not exists customer_id uuid;
alter table public.leads add column if not exists contact_id uuid;
alter table public.leads add column if not exists converted_at timestamptz;
alter table public.leads drop constraint if exists leads_org_customer_fkey;
alter table public.leads add constraint leads_org_customer_fkey
  foreign key (organization_id, customer_id)
  references public.customers (organization_id, id) on delete set null (customer_id);
alter table public.leads drop constraint if exists leads_org_contact_fkey;
alter table public.leads add constraint leads_org_contact_fkey
  foreign key (organization_id, contact_id)
  references public.contacts (organization_id, id) on delete set null (contact_id);

-- ---------------------------------------------------------------------------
-- products (the catalog)
-- ---------------------------------------------------------------------------
create table if not exists public.products (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references public.organizations (id) on delete cascade,
  user_id           uuid not null references auth.users (id) on delete cascade,
  name              text not null check (char_length(name) between 1 and 200),
  description       text,
  kind              text not null default 'service' check (kind in ('service', 'product')),
  category          text,
  sku               text,
  -- Shown after the price, e.g. "each", "hour", "page".
  unit              text not null default 'each',
  unit_price_cents  bigint not null default 0 check (unit_price_cents >= 0),
  -- Null is a one time charge.
  billing_interval  text check (billing_interval in ('month', 'year')),
  taxable           boolean not null default false,
  is_active         boolean not null default true,
  position          integer not null default 0,
  stripe_product_id text,
  stripe_price_id   text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (organization_id, id)
);

create unique index if not exists products_org_sku_idx
  on public.products (organization_id, sku) where sku is not null;
create index if not exists products_org_active_idx
  on public.products (organization_id, is_active, position);

-- ---------------------------------------------------------------------------
-- deals and their line items
-- ---------------------------------------------------------------------------
create table if not exists public.deals (
  id                         uuid primary key default gen_random_uuid(),
  organization_id            uuid not null references public.organizations (id) on delete cascade,
  -- The deal owner.
  user_id                    uuid not null references auth.users (id) on delete cascade,
  -- Per organization, human friendly ("Deal #1001"). Set by a trigger.
  number                     integer,
  title                      text not null check (char_length(title) between 1 and 200),
  lead_id                    uuid,
  customer_id                uuid,
  contact_id                 uuid,
  status                     text not null default 'open' check (status in ('open', 'won', 'lost')),
  expected_close_on          date,
  notes                      text,
  -- Kept in step with deal_items by a trigger.
  one_time_total_cents       bigint not null default 0,
  monthly_total_cents        bigint not null default 0,
  yearly_total_cents         bigint not null default 0,
  payment_url                text,
  stripe_payment_link_id     text unique,
  stripe_checkout_session_id text,
  paid_at                    timestamptz,
  paid_amount_cents          bigint,
  won_at                     timestamptz,
  lost_at                    timestamptz,
  lost_reason                text,
  created_at                 timestamptz not null default now(),
  updated_at                 timestamptz not null default now(),
  unique (organization_id, id),
  unique (organization_id, number),
  foreign key (organization_id, lead_id)
    references public.leads (organization_id, id) on delete set null (lead_id),
  foreign key (organization_id, customer_id)
    references public.customers (organization_id, id) on delete set null (customer_id),
  foreign key (organization_id, contact_id)
    references public.contacts (organization_id, id) on delete set null (contact_id)
);

create index if not exists deals_org_status_idx on public.deals (organization_id, status, updated_at desc);
create index if not exists deals_lead_idx on public.deals (lead_id) where lead_id is not null;
create index if not exists deals_customer_idx on public.deals (customer_id) where customer_id is not null;

create table if not exists public.deal_items (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations (id) on delete cascade,
  user_id          uuid not null references auth.users (id) on delete cascade,
  deal_id          uuid not null,
  product_id       uuid,
  name             text not null check (char_length(name) between 1 and 200),
  description      text,
  quantity         numeric(10, 2) not null default 1 check (quantity > 0),
  unit_price_cents bigint not null default 0 check (unit_price_cents >= 0),
  billing_interval text check (billing_interval in ('month', 'year')),
  position         integer not null default 0,
  created_at       timestamptz not null default now(),
  foreign key (organization_id, deal_id)
    references public.deals (organization_id, id) on delete cascade,
  foreign key (organization_id, product_id)
    references public.products (organization_id, id) on delete set null (product_id)
);

create index if not exists deal_items_deal_idx on public.deal_items (deal_id, position);

-- Stripe webhook events already handled, so a retry never applies twice.
-- Service role only (row security on, no policies).
create table if not exists public.stripe_events (
  id          text primary key,
  type        text not null,
  received_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array['customers', 'contacts', 'products', 'deals']
  loop
    execute format('drop trigger if exists %I on public.%I', t || '_set_updated_at', t);
    execute format(
      'create trigger %I before update on public.%I
         for each row execute function public.set_updated_at()', t || '_set_updated_at', t);
  end loop;

  foreach t in array array['customers', 'contacts', 'products', 'deals', 'deal_items']
  loop
    execute format('drop trigger if exists fill_organization_id on public.%I', t);
    execute format(
      'create trigger fill_organization_id before insert on public.%I
         for each row execute function public.fill_organization_id()', t);
  end loop;
end $$;

-- Hands out the next deal number from the organization's counter. Security
-- definer because members can't update their organization row directly.
create or replace function public.assign_deal_number()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.number is null then
    update public.organizations
    set deal_seq = deal_seq + 1
    where id = new.organization_id
    returning deal_seq into new.number;
  end if;
  return new;
end;
$$;

-- Runs after fill_organization_id (triggers fire in name order).
drop trigger if exists number_deal on public.deals;
create trigger number_deal
  before insert on public.deals
  for each row execute function public.assign_deal_number();

-- Keeps a deal's totals equal to the sum of its lines. Security definer
-- because members can't write the totals columns themselves.
create or replace function public.refresh_deal_totals()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target uuid := coalesce(new.deal_id, old.deal_id);
begin
  update public.deals d
  set one_time_total_cents = coalesce(s.one_time, 0),
      monthly_total_cents = coalesce(s.monthly, 0),
      yearly_total_cents = coalesce(s.yearly, 0)
  from (
    select
      round(sum(i.quantity * i.unit_price_cents) filter (where i.billing_interval is null))::bigint
        as one_time,
      round(sum(i.quantity * i.unit_price_cents) filter (where i.billing_interval = 'month'))::bigint
        as monthly,
      round(sum(i.quantity * i.unit_price_cents) filter (where i.billing_interval = 'year'))::bigint
        as yearly
    from public.deal_items i
    where i.deal_id = target
  ) s
  where d.id = target;

  -- A line moved between deals: refresh the old one too.
  if tg_op = 'UPDATE' and old.deal_id is distinct from new.deal_id then
    update public.deals d
    set one_time_total_cents = coalesce(s.one_time, 0),
        monthly_total_cents = coalesce(s.monthly, 0),
        yearly_total_cents = coalesce(s.yearly, 0)
    from (
      select
        round(sum(i.quantity * i.unit_price_cents) filter (where i.billing_interval is null))::bigint
          as one_time,
        round(sum(i.quantity * i.unit_price_cents) filter (where i.billing_interval = 'month'))::bigint
          as monthly,
        round(sum(i.quantity * i.unit_price_cents) filter (where i.billing_interval = 'year'))::bigint
          as yearly
      from public.deal_items i
      where i.deal_id = old.deal_id
    ) s
    where d.id = old.deal_id;
  end if;

  return null;
end;
$$;

drop trigger if exists refresh_deal_totals on public.deal_items;
create trigger refresh_deal_totals
  after insert or update or delete on public.deal_items
  for each row execute function public.refresh_deal_totals();

-- A lead's deal_value (dollars, shown on the pipeline) follows its deals:
-- the first year value of every deal that isn't lost. A lead with no live
-- deals keeps the value typed in by hand.
create or replace function public.sync_lead_deal_value()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  lead uuid;
begin
  foreach lead in array array[new.lead_id, old.lead_id]
  loop
    continue when lead is null;
    update public.leads l
    set deal_value = s.total / 100.0
    from (
      select sum(d.one_time_total_cents + 12 * d.monthly_total_cents + d.yearly_total_cents)
        as total
      from public.deals d
      where d.lead_id = lead and d.status <> 'lost'
    ) s
    where l.id = lead and s.total is not null;
  end loop;
  return null;
end;
$$;

drop trigger if exists sync_lead_deal_value on public.deals;
create trigger sync_lead_deal_value
  after insert or update of lead_id, status, one_time_total_cents, monthly_total_cents,
    yearly_total_cents or delete
  on public.deals
  for each row execute function public.sync_lead_deal_value();

-- ---------------------------------------------------------------------------
-- convert_lead is security invoker, so a signed in user only reaches their
-- own organization's rows. mark_deal_won is security definer (it writes the
-- protected payment columns), so it checks membership itself. The Stripe
-- webhook calls it with the service role, where auth.uid() is null.
-- ---------------------------------------------------------------------------
create or replace function public.convert_lead(p_lead uuid)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  l public.leads%rowtype;
  new_customer uuid;
  new_contact uuid;
begin
  select * into l from public.leads where id = p_lead for update;
  if not found then
    raise exception 'Lead not found' using errcode = 'P0002';
  end if;
  if l.customer_id is not null then
    return l.customer_id;
  end if;

  insert into public.customers (
    organization_id, user_id, kind, name, email, phone, website,
    address_line1, city, state, notes, source_lead_id
  )
  values (
    l.organization_id, l.user_id, 'business', l.business_name, l.email, l.phone, l.website,
    l.address, l.city, l.state, l.notes, l.id
  )
  returning id into new_customer;

  if coalesce(l.contact_name, l.email, l.phone) is not null then
    insert into public.contacts (
      organization_id, user_id, customer_id, full_name, email, phone, is_primary
    )
    values (
      l.organization_id, l.user_id, new_customer,
      coalesce(l.contact_name, l.business_name), l.email, l.phone, true
    )
    returning id into new_contact;
  end if;

  update public.leads
  set customer_id = new_customer, contact_id = new_contact, converted_at = now()
  where id = l.id;

  insert into public.activities (organization_id, user_id, lead_id, type, body)
  values (l.organization_id, coalesce(auth.uid(), l.user_id), l.id, 'stage_change',
          'Converted to a customer');

  return new_customer;
end;
$$;

-- Marks a deal won (from the deal page, or the Stripe webhook with the paid
-- amount and checkout session). Safe to call twice: a won deal is left alone.
create or replace function public.mark_deal_won(
  p_deal uuid,
  p_paid_cents bigint default null,
  p_checkout_session text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  d public.deals%rowtype;
  customer uuid;
  contact uuid;
  summary text;
begin
  select * into d from public.deals where id = p_deal for update;
  if not found
    or (auth.uid() is not null and not public.is_org_member(d.organization_id)) then
    raise exception 'Deal not found' using errcode = 'P0002';
  end if;
  -- Only the webhook (no signed in user) may record a payment.
  if auth.uid() is not null then
    p_paid_cents := null;
    p_checkout_session := null;
  end if;
  if d.status = 'won' then
    return;
  end if;

  customer := d.customer_id;
  contact := d.contact_id;
  if d.lead_id is not null then
    if customer is null then
      customer := public.convert_lead(d.lead_id);
    end if;
    if contact is null then
      select l.contact_id into contact from public.leads l where l.id = d.lead_id;
    end if;
    update public.leads set stage = 'won' where id = d.lead_id and stage <> 'won';
  end if;

  update public.deals
  set status = 'won',
      won_at = now(),
      lost_at = null,
      lost_reason = null,
      customer_id = customer,
      contact_id = contact,
      paid_at = case when p_paid_cents is not null then now() else paid_at end,
      paid_amount_cents = coalesce(p_paid_cents, paid_amount_cents),
      stripe_checkout_session_id = coalesce(p_checkout_session, stripe_checkout_session_id)
  where id = d.id;

  if d.lead_id is not null then
    summary := format('Deal #%s won', d.number);
    if p_paid_cents is not null then
      summary := summary || format(', paid $%s through Stripe', to_char(p_paid_cents / 100.0, 'FM999,999,990.00'));
    end if;
    insert into public.activities (organization_id, user_id, lead_id, type, body)
    values (d.organization_id, coalesce(auth.uid(), d.user_id), d.lead_id, 'deal', summary);
  end if;
end;
$$;

revoke execute on function public.convert_lead(uuid) from public, anon;
revoke execute on function public.mark_deal_won(uuid, bigint, text) from public, anon;
grant execute on function public.convert_lead(uuid) to authenticated, service_role;
grant execute on function public.mark_deal_won(uuid, bigint, text) to authenticated, service_role;
revoke execute on function public.assign_deal_number() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Row security
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array['customers', 'contacts', 'products', 'deals', 'deal_items']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "org rows" on public.%I', t);
    execute format(
      'create policy "org rows" on public.%I for all to authenticated
         using (public.is_org_member(organization_id))
         with check (public.is_org_member(organization_id))', t);
  end loop;
end $$;

alter table public.stripe_events enable row level security;

-- A deal's number, totals, and payment fields are written only by triggers,
-- mark_deal_won, and server code with the service role, never the browser.
-- Column grants only bite once the table wide grant is gone.
revoke insert, update on public.deals from authenticated;
grant insert (organization_id, user_id, title, lead_id, customer_id, contact_id,
              expected_close_on, notes)
  on public.deals to authenticated;
grant update (title, lead_id, customer_id, contact_id, status, expected_close_on, notes,
              lost_at, lost_reason)
  on public.deals to authenticated;
