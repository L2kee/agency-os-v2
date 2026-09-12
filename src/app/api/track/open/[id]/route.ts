import { createAdminClient, hasAdminClient } from "@/server/supabase/admin";

export const dynamic = "force-dynamic";

// 1x1 transparent GIF
const PIXEL = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (hasAdminClient) {
    try {
      const admin = createAdminClient();
      await admin
        .from("email_messages")
        .update({ opened_at: new Date().toISOString() })
        .eq("id", id)
        .is("opened_at", null);
    } catch {
      // tracking is best-effort
    }
  }

  return new Response(PIXEL, {
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    },
  });
}
