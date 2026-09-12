import { NextResponse } from "next/server";
import { createAdminClient, hasAdminClient } from "@/server/supabase/admin";
import { processDueEnrollments } from "@/server/outreach";

export const dynamic = "force-dynamic";

// Scheduled by vercel.json (hourly in production). Also callable manually with
// the CRON_SECRET. Locally, use the "Send due emails now" button instead.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  const url = new URL(request.url);
  const provided = auth?.replace("Bearer ", "") ?? url.searchParams.get("key");

  if (secret && provided !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!hasAdminClient) {
    return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY not configured" }, { status: 500 });
  }

  const admin = createAdminClient();
  const now = new Date();

  const { data: dueRows } = await admin
    .from("sequence_enrollments")
    .select("user_id")
    .eq("status", "active")
    .lte("next_run_at", now.toISOString());

  const userIds = [...new Set((dueRows ?? []).map((r) => r.user_id as string))];

  let sent = 0;
  let failed = 0;
  let processed = 0;
  for (const userId of userIds) {
    const r = await processDueEnrollments({ supabase: admin, userId, now });
    sent += r.sent;
    failed += r.failed;
    processed += r.processed;
  }

  return NextResponse.json({ users: userIds.length, processed, sent, failed });
}
