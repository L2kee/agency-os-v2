// Database tests for organizations and the sales system. Runs the real
// migrations in an in process Postgres (PGlite) with Supabase's auth schema
// and roles stubbed, so no Docker and no live project are needed.
//
// It first builds the schema as it stood before 0007 and seeds it the way the
// live database looks (two users, one admin), then runs 0007 and 0008 on top,
// so the backfill is tested against realistic data.
//
// Usage: npm run test:db

import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";

const here = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(here, "..", "migrations");

const STUB = `
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create schema auth;
create table auth.users (id uuid primary key, email text, created_at timestamptz default now());
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
grant usage on schema auth, public to anon, authenticated, service_role;
grant execute on all functions in schema auth to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
`;

const MOE = "00000000-0000-0000-0000-00000000000a";
const AMANDA = "00000000-0000-0000-0000-00000000000b";
const BOB = "00000000-0000-0000-0000-00000000000c";

const db = new PGlite();
await db.exec(STUB);

const migrations = readdirSync(migrationsDir).filter((name) => name.endsWith(".sql")).sort();
const before = migrations.filter((name) => name < "0007");
const after = migrations.filter((name) => name >= "0007");

for (const name of before) {
  await db.exec(readFileSync(join(migrationsDir, name), "utf8"));
}

// Seed the pre 0007 shape. Moe signs up first, so 0005's trigger makes him admin.
await db.exec(`
  insert into auth.users (id, email, created_at) values
    ('${MOE}', 'moe@test.local', now() - interval '2 days'),
    ('${AMANDA}', 'amanda@test.local', now() - interval '1 day');
  insert into public.leads (id, user_id, business_name, contact_name, email, phone, place_id, deal_value)
    values ('10000000-0000-0000-0000-000000000001', '${MOE}', 'Acme Plumbing', 'Ann Acme',
            'ann@acme.test', '407 555 0101', 'place-1', 1000);
  insert into public.activities (user_id, lead_id, body)
    values ('${MOE}', '10000000-0000-0000-0000-000000000001', 'First call');
  insert into public.sequences (id, user_id, name)
    values ('20000000-0000-0000-0000-000000000001', '${MOE}', 'Cold');
  insert into public.sequence_steps (user_id, sequence_id, subject, body)
    values ('${MOE}', '20000000-0000-0000-0000-000000000001', 'Hi', 'Hello');
  insert into public.sequence_enrollments (id, user_id, lead_id, sequence_id)
    values ('30000000-0000-0000-0000-000000000001', '${MOE}',
            '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001');
  insert into public.email_messages (user_id, lead_id, enrollment_id, to_email, subject, body)
    values ('${MOE}', '10000000-0000-0000-0000-000000000001',
            '30000000-0000-0000-0000-000000000001', 'ann@acme.test', 'Hi', 'Hello');
  insert into public.sending_accounts (user_id, from_email, secret_encrypted)
    values ('${MOE}', 'moe@mail.test', 'v1.cipher');
  insert into public.playbook_notes (user_id, item_key, note) values ('${MOE}', 'opener', 'mine');
`);

for (const name of after) {
  await db.exec(readFileSync(join(migrationsDir, name), "utf8"));
}

const evogency = (await db.query(`select id from public.organizations where slug = 'evogency'`))
  .rows[0]?.id;

// A second, unrelated business signs up after the migration.
await db.exec(`
  insert into auth.users (id, email) values ('${BOB}', 'bob@other.test');
  insert into public.organizations (id, name, slug, industry)
    values ('90000000-0000-0000-0000-000000000001', 'Bob HVAC', 'bob-hvac', 'home_service');
  insert into public.organization_members (organization_id, user_id, role)
    values ('90000000-0000-0000-0000-000000000001', '${BOB}', 'owner');
`);
const bobOrg = "90000000-0000-0000-0000-000000000001";

// Runs fn as a role and user in a transaction. Rolls back unless keep is true.
async function as(role, user, fn, keep = false) {
  return db.transaction(async (tx) => {
    await tx.query(`select set_config('request.jwt.claim.sub', $1, true)`, [user ?? ""]);
    await tx.exec(`set local role ${role}`);
    try {
      return await fn(tx);
    } finally {
      if (!keep) {
        await tx.rollback();
      }
    }
  });
}

const asUser = (user, fn, keep) => as("authenticated", user, fn, keep);

async function rejects(promise, pattern) {
  await assert.rejects(promise, (err) => pattern.test(err.message));
}

let passed = 0;
async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  ok   ${name}`);
  } catch (err) {
    console.log(`  FAIL ${name}\n       ${err.message}`);
    process.exitCode = 1;
  }
}

const OLD_TABLES = [
  "leads",
  "activities",
  "email_templates",
  "sequences",
  "sequence_steps",
  "sequence_enrollments",
  "email_messages",
  "call_logs",
  "playbook_notes",
  "sending_accounts",
];
const SALES_TABLES = ["customers", "contacts", "products", "deals", "deal_items"];

console.log("Organizations");

await test("backfill creates EVOGENCY as the platform organization", async () => {
  const { rows } = await db.query(`select * from public.organizations where id = $1`, [evogency]);
  assert.equal(rows[0].name, "EVOGENCY");
  assert.equal(rows[0].is_platform, true);
  assert.equal(rows[0].industry, "agency");
});

await test("backfill makes the first admin owner and keeps members as members", async () => {
  const { rows } = await db.query(
    `select user_id, role from public.organization_members where organization_id = $1 order by role`,
    [evogency],
  );
  assert.deepEqual(
    rows.map((row) => [row.user_id, row.role]),
    [
      [AMANDA, "member"],
      [MOE, "owner"],
    ],
  );
});

await test("every existing row is assigned to EVOGENCY and none are lost", async () => {
  for (const table of OLD_TABLES) {
    const { rows } = await db.query(
      `select count(*)::int as total, count(*) filter (where organization_id = $1)::int as ours
       from public.${table}`,
      [evogency],
    );
    assert.equal(rows[0].total, rows[0].ours, `${table} has rows outside EVOGENCY`);
  }
  const { rows } = await db.query(`select count(*)::int as n from public.leads`);
  assert.equal(rows[0].n, 1);
});

await test("teammates now share sales data (Amanda reads Moe's lead)", async () => {
  const rows = await asUser(AMANDA, async (tx) => (await tx.query(`select id from public.leads`)).rows);
  assert.equal(rows.length, 1);
});

await test("personal rows stay personal (sending key and playbook notes)", async () => {
  await asUser(AMANDA, async (tx) => {
    assert.equal((await tx.query(`select * from public.sending_accounts`)).rows.length, 0);
    assert.equal((await tx.query(`select * from public.playbook_notes`)).rows.length, 0);
  });
  await asUser(MOE, async (tx) => {
    assert.equal((await tx.query(`select * from public.sending_accounts`)).rows.length, 1);
  });
});

await test("another organization sees none of EVOGENCY's rows in any table", async () => {
  await asUser(BOB, async (tx) => {
    for (const table of [...OLD_TABLES, ...SALES_TABLES]) {
      const { rows } = await tx.query(`select * from public.${table}`);
      assert.equal(rows.length, 0, `${table} leaked ${rows.length} rows`);
    }
    const orgs = (await tx.query(`select id from public.organizations`)).rows;
    assert.deepEqual(
      orgs.map((row) => row.id),
      [bobOrg],
    );
    const members = (await tx.query(`select user_id from public.organization_members`)).rows;
    assert.deepEqual(
      members.map((row) => row.user_id),
      [BOB],
    );
    const profiles = (await tx.query(`select id from public.profiles`)).rows;
    assert.deepEqual(
      profiles.map((row) => row.id),
      [BOB],
    );
  });
});

await test("anon sees nothing", async () => {
  await as("anon", null, async (tx) => {
    for (const table of ["organizations", "leads", "deals", "customers"]) {
      assert.equal((await tx.query(`select * from public.${table}`)).rows.length, 0);
    }
  });
});

await test("a user can't write into another organization", async () => {
  await rejects(
    asUser(BOB, (tx) =>
      tx.query(
        `insert into public.leads (user_id, organization_id, business_name) values ($1, $2, 'X')`,
        [BOB, evogency],
      ),
    ),
    /row-level security/,
  );
});

await test("an insert without organization_id lands in the user's own organization", async () => {
  const org = await asUser(BOB, async (tx) => {
    const { rows } = await tx.query(
      `insert into public.leads (user_id, business_name) values ($1, 'Mine') returning organization_id`,
      [BOB],
    );
    return rows[0].organization_id;
  });
  assert.equal(org, bobOrg);
});

await test("the website's service role lead insert (user_id only) lands in EVOGENCY", async () => {
  const org = await as("service_role", null, async (tx) => {
    const { rows } = await tx.query(
      `insert into public.leads (user_id, business_name, source) values ($1, 'Site chat lead', 'website_form')
       returning organization_id`,
      [MOE],
    );
    return rows[0].organization_id;
  });
  assert.equal(org, evogency);
});

await test("a child row can't point at another organization's parent", async () => {
  await rejects(
    asUser(BOB, (tx) =>
      tx.query(`insert into public.activities (user_id, lead_id, body) values ($1, $2, 'sneaky')`, [
        BOB,
        "10000000-0000-0000-0000-000000000001",
      ]),
    ),
    /foreign key/,
  );
});

await test("Google Places dedupe is per organization", async () => {
  await asUser(BOB, async (tx) => {
    await tx.query(
      `insert into public.leads (user_id, business_name, place_id) values ($1, 'Same place', 'place-1')`,
      [BOB],
    );
  });
  await rejects(
    asUser(AMANDA, (tx) =>
      tx.query(
        `insert into public.leads (user_id, business_name, place_id) values ($1, 'Dupe', 'place-1')`,
        [AMANDA],
      ),
    ),
    /duplicate key/,
  );
});

await test("a deactivated member sees nothing", async () => {
  await db.query(`update public.organization_members set is_active = false where user_id = $1`, [AMANDA]);
  try {
    await asUser(AMANDA, async (tx) => {
      assert.equal((await tx.query(`select * from public.leads`)).rows.length, 0);
    });
  } finally {
    await db.query(`update public.organization_members set is_active = true where user_id = $1`, [AMANDA]);
  }
});

await test("members can't add themselves to an organization", async () => {
  await rejects(
    asUser(BOB, (tx) =>
      tx.query(`insert into public.organization_members (organization_id, user_id) values ($1, $2)`, [
        evogency,
        BOB,
      ]),
    ),
    /row-level security/,
  );
});

await test("only admins rename the organization, and nobody flips platform or billing", async () => {
  await asUser(AMANDA, async (tx) => {
    const { rowCount } = await tx.query(`update public.organizations set name = 'Hijack'`);
    assert.equal(rowCount, 0);
  });
  await asUser(MOE, async (tx) => {
    const { rowCount } = await tx.query(`update public.organizations set name = 'EVOGENCY LLC'`);
    assert.equal(rowCount, 1);
  });
  await rejects(
    asUser(BOB, (tx) => tx.query(`update public.organizations set is_platform = true`)),
    /permission denied/,
  );
  await rejects(
    asUser(MOE, (tx) => tx.query(`update public.organizations set plan = 'free forever'`)),
    /permission denied/,
  );
});

console.log("Sales");

const LEAD = "10000000-0000-0000-0000-000000000001";
let dealId;
let dealNumber;

await test("catalog items and a deal with lines compute totals", async () => {
  await asUser(
    MOE,
    async (tx) => {
      const product = await tx.query(
        `insert into public.products (user_id, name, unit_price_cents, billing_interval)
         values ($1, 'AI Front Desk monthly', 29700, 'month') returning id`,
        [MOE],
      );
      const deal = await tx.query(
        `insert into public.deals (user_id, title, lead_id) values ($1, 'Front desk for Acme', $2)
         returning id, number`,
        [MOE, LEAD],
      );
      dealId = deal.rows[0].id;
      dealNumber = deal.rows[0].number;
      await tx.query(
        `insert into public.deal_items (user_id, deal_id, product_id, name, unit_price_cents, billing_interval)
         values ($1, $2, $3, 'AI Front Desk monthly', 29700, 'month'),
                ($1, $2, null, 'Setup', 99700, null),
                ($1, $2, null, 'Extra pages', 5000, null)`,
        [MOE, dealId, product.rows[0].id],
      );
      await tx.query(`update public.deal_items set quantity = 3 where name = 'Extra pages'`);
    },
    true,
  );
  const { rows } = await db.query(`select * from public.deals where id = $1`, [dealId]);
  assert.equal(Number(rows[0].one_time_total_cents), 99700 + 3 * 5000);
  assert.equal(Number(rows[0].monthly_total_cents), 29700);
  assert.equal(Number(rows[0].yearly_total_cents), 0);
});

await test("deal numbers count up per organization from 1001", async () => {
  assert.equal(dealNumber, 1001);
  const numbers = await asUser(BOB, async (tx) => {
    const first = await tx.query(`insert into public.deals (user_id, title) values ($1, 'A') returning number`, [BOB]);
    const second = await tx.query(`insert into public.deals (user_id, title) values ($1, 'B') returning number`, [BOB]);
    return [first.rows[0].number, second.rows[0].number];
  });
  assert.deepEqual(numbers, [1001, 1002]);
});

await test("the lead's pipeline value becomes the deal's first year value", async () => {
  const { rows } = await db.query(`select deal_value from public.leads where id = $1`, [LEAD]);
  assert.equal(Number(rows[0].deal_value), (99700 + 15000 + 12 * 29700) / 100);
});

await test("removing a line refreshes the totals", async () => {
  await asUser(MOE, async (tx) => {
    await tx.query(`delete from public.deal_items where name = 'Extra pages'`);
    const { rows } = await tx.query(`select one_time_total_cents from public.deals where id = $1`, [dealId]);
    assert.equal(Number(rows[0].one_time_total_cents), 99700);
  });
});

await test("users can't write totals, numbers, or payment fields on a deal", async () => {
  for (const column of ["one_time_total_cents = 1", "number = 7", "paid_at = now()", "payment_url = 'x'"]) {
    await rejects(
      asUser(MOE, (tx) => tx.query(`update public.deals set ${column} where id = $1`, [dealId])),
      /permission denied/,
    );
  }
  await rejects(
    asUser(MOE, (tx) =>
      tx.query(`insert into public.deals (user_id, title, paid_amount_cents) values ($1, 'Free', 1)`, [MOE]),
    ),
    /permission denied/,
  );
});

await test("another organization can't win, see, or price EVOGENCY's deal", async () => {
  await rejects(
    asUser(BOB, (tx) => tx.query(`select public.mark_deal_won($1)`, [dealId])),
    /Deal not found/,
  );
  await rejects(
    asUser(BOB, (tx) =>
      tx.query(`insert into public.deal_items (user_id, deal_id, name) values ($1, $2, 'x')`, [BOB, dealId]),
    ),
    /foreign key/,
  );
});

await test("winning a deal converts the lead into a customer with a contact", async () => {
  await asUser(MOE, (tx) => tx.query(`select public.mark_deal_won($1, 123, 'cs_spoofed')`, [dealId]), true);

  const deal = (await db.query(`select * from public.deals where id = $1`, [dealId])).rows[0];
  assert.equal(deal.status, "won");
  assert.ok(deal.won_at);
  assert.equal(deal.paid_at, null, "a signed in user can't record a payment");
  assert.equal(deal.stripe_checkout_session_id, null);

  const lead = (await db.query(`select * from public.leads where id = $1`, [LEAD])).rows[0];
  assert.equal(lead.stage, "won");
  assert.equal(lead.customer_id, deal.customer_id);
  assert.equal(lead.contact_id, deal.contact_id);

  const customer = (await db.query(`select * from public.customers where id = $1`, [deal.customer_id])).rows[0];
  assert.equal(customer.name, "Acme Plumbing");
  assert.equal(customer.organization_id, evogency);
  assert.equal(customer.source_lead_id, LEAD);

  const contact = (await db.query(`select * from public.contacts where id = $1`, [deal.contact_id])).rows[0];
  assert.equal(contact.full_name, "Ann Acme");
  assert.equal(contact.is_primary, true);

  const activities = (
    await db.query(`select type, body from public.activities where lead_id = $1 order by created_at`, [LEAD])
  ).rows.map((row) => row.type);
  assert.ok(activities.includes("deal"));
  assert.ok(activities.includes("stage_change"));
});

await test("winning twice changes nothing and makes no second customer", async () => {
  await asUser(MOE, (tx) => tx.query(`select public.mark_deal_won($1)`, [dealId]), true);
  const { rows } = await db.query(`select count(*)::int as n from public.customers`);
  assert.equal(rows[0].n, 1);
});

await test("the webhook (service role) records the payment on a second deal", async () => {
  await as(
    "service_role",
    null,
    async (tx) => {
      const deal = await tx.query(
        `insert into public.deals (user_id, title, lead_id) values ($1, 'Add on', $2) returning id`,
        [MOE, LEAD],
      );
      await tx.query(`select public.mark_deal_won($1, 99700, 'cs_test_1')`, [deal.rows[0].id]);
      const { rows } = await tx.query(`select * from public.deals where id = $1`, [deal.rows[0].id]);
      assert.equal(Number(rows[0].paid_amount_cents), 99700);
      assert.equal(rows[0].stripe_checkout_session_id, "cs_test_1");
      assert.ok(rows[0].paid_at);
      assert.equal(rows[0].customer_id, (await tx.query(`select customer_id from public.leads where id = $1`, [LEAD])).rows[0].customer_id);
      const paid = await tx.query(
        `select body from public.activities where lead_id = $1 and body like '%paid $997.00%'`,
        [LEAD],
      );
      assert.equal(paid.rows.length, 1);
    },
  );
});

await test("deleting a lead keeps its customer and won deals", async () => {
  await asUser(MOE, async (tx) => {
    await tx.query(`delete from public.leads where id = $1`, [LEAD]);
    assert.equal((await tx.query(`select * from public.customers`)).rows.length, 1);
    const { rows } = await tx.query(`select lead_id, status from public.deals where id = $1`, [dealId]);
    assert.equal(rows[0].lead_id, null);
    assert.equal(rows[0].status, "won");
  });
});

await test("Stripe events table is closed to signed in users", async () => {
  await asUser(MOE, async (tx) => {
    assert.equal((await tx.query(`select * from public.stripe_events`)).rows.length, 0);
  });
  await rejects(
    asUser(MOE, (tx) => tx.query(`insert into public.stripe_events (id, type) values ('evt_1', 'x')`)),
    /row-level security/,
  );
});

await test("removing a member hands their shared rows to the admin first", async () => {
  await asUser(
    AMANDA,
    async (tx) => {
      await tx.query(`insert into public.leads (user_id, business_name) values ($1, 'Amanda lead')`, [AMANDA]);
      await tx.query(`insert into public.customers (user_id, name) values ($1, 'Amanda customer')`, [AMANDA]);
      await tx.query(`insert into public.playbook_notes (user_id, item_key) values ($1, 'close')`, [AMANDA]);
    },
    true,
  );
  await rejects(
    asUser(MOE, (tx) => tx.query(`select public.transfer_member_rows($1, $2, $3)`, [evogency, AMANDA, MOE])),
    /permission denied/,
  );
  await as("service_role", null, (tx) =>
    tx.query(`select public.transfer_member_rows($1, $2, $3)`, [evogency, AMANDA, BOB]),
  ).then(
    () => assert.fail("a non member must not receive rows"),
    (err) => assert.match(err.message, /active member/),
  );
  await as(
    "service_role",
    null,
    (tx) => tx.query(`select public.transfer_member_rows($1, $2, $3)`, [evogency, AMANDA, MOE]),
    true,
  );
  await db.query(`delete from auth.users where id = $1`, [AMANDA]);
  const lead = await db.query(`select user_id from public.leads where business_name = 'Amanda lead'`);
  const customer = await db.query(`select user_id from public.customers where name = 'Amanda customer'`);
  assert.equal(lead.rows[0]?.user_id, MOE);
  assert.equal(customer.rows[0]?.user_id, MOE);
  const notes = await db.query(`select * from public.playbook_notes where item_key = 'close'`);
  assert.equal(notes.rows.length, 0);
});

await test("the EVOGENCY catalog seed loads once and only into EVOGENCY", async () => {
  const seed = readFileSync(join(here, "..", "seed", "evogency_catalog.sql"), "utf8");
  await db.exec(seed);
  await db.exec(seed);
  const { rows } = await db.query(
    `select organization_id, count(*)::int as n from public.products where sku is not null group by 1`,
  );
  assert.equal(rows.length, 1);
  assert.equal(rows[0].organization_id, evogency);
  assert.equal(rows[0].n, 10);
  const monthly = await db.query(
    `select unit_price_cents from public.products where sku = 'afd-monthly' and billing_interval = 'month'`,
  );
  assert.equal(Number(monthly.rows[0].unit_price_cents), 29700);
});

await test("migrations 0007 and 0008 can run a second time", async () => {
  for (const name of after) {
    await db.exec(readFileSync(join(migrationsDir, name), "utf8"));
  }
  const { rows } = await db.query(`select count(*)::int as n from public.organizations`);
  assert.equal(rows[0].n, 2);
});

await test("a fresh database (no users) gets no EVOGENCY organization", async () => {
  const fresh = new PGlite();
  await fresh.exec(STUB);
  for (const name of migrations) {
    await fresh.exec(readFileSync(join(migrationsDir, name), "utf8"));
  }
  const { rows } = await fresh.query(`select count(*)::int as n from public.organizations`);
  assert.equal(rows[0].n, 0);
  await fresh.close();
});

console.log(`\n${passed} passed${process.exitCode ? ", some failed" : ""}`);
await db.close();
