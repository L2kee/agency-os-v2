import { NextResponse } from "next/server";
import { createClient } from "@/server/supabase/server";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export async function POST() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(`${APP_URL}/login`, { status: 303 });
}
