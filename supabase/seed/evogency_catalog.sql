-- EVOGENCY's starter catalog (2026-11-21). Only prices Moe has locked or
-- approved, from the vault notes AI Consulting, Listing Suite, and Home
-- Service Growth Kit. Not included until Moe sets them: standard "You run it"
-- one time prices, and websites, apps, stores, and CRMs.
--
-- Run once after 0008_sales.sql. Safe to run again (SKUs don't duplicate).

insert into public.products (
  organization_id, user_id, category, name, description, sku,
  unit_price_cents, billing_interval, position
)
select o.id, m.user_id, v.category, v.name, v.description, v.sku,
       v.cents, v.billing_interval, v.position
from public.organizations o
join public.organization_members m on m.organization_id = o.id and m.role = 'owner'
cross join (values
  ('AI Front Desk', 'AI Front Desk setup', 'We run it. Build, voice, calendar booking, and tuning.',
   'afd-setup', 99700, null, 1),
  ('AI Front Desk', 'AI Front Desk monthly', 'We run it. Minutes, tuning, updates, and the monthly report. Month to month.',
   'afd-monthly', 29700, 'month', 2),
  ('AI Front Desk', 'AI Front Desk founding setup', 'Founding price for the first 3 clients, in exchange for a testimonial and a case study.',
   'afd-setup-founding', 49700, null, 3),
  ('AI Website Assistant', 'AI Website Assistant setup', 'We run it. A site chat assistant like Ava on their website.',
   'awa-setup', 49700, null, 1),
  ('AI Website Assistant', 'AI Website Assistant monthly', 'We run it. Hosting, tuning, and updates. Month to month.',
   'awa-monthly', 19700, 'month', 2),
  ('AI Website Assistant', 'AI Website Assistant, you run it', 'One time. Built in their own accounts, with training and a playbook.',
   'awa-own', 149700, null, 3),
  ('AI Consulting', 'AI Audit', 'Credited in full toward any build signed within 30 days.',
   'ai-audit', 150000, null, 1),
  ('Listing Suite', 'Signature Listing', 'One luxury listing page, live in 48 hours, hosted through closing.',
   'ls-signature', 19900, null, 1),
  ('Listing Suite', 'Listing Partner', 'Up to 4 new listings a month, plus their own agent page and a monthly report.',
   'ls-partner', 39900, 'month', 2),
  ('Digital products', 'Home Service Growth Kit', 'The 10 page copy and paste growth kit for home service businesses.',
   'growth-kit', 2700, null, 1)
) as v (category, name, description, sku, cents, billing_interval, position)
where o.slug = 'evogency'
on conflict (organization_id, sku) where sku is not null do nothing;
