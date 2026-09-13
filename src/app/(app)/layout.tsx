import { hasSupabaseEnv } from "@/server/supabase/env";
import { requireUser } from "@/server/auth";
import { AppShell } from "@/components/app-shell";
import { SetupNotice } from "@/components/setup-notice";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  if (!hasSupabaseEnv) return <SetupNotice />;

  const { user, profile } = await requireUser();

  return (
    <AppShell email={user.email ?? ""} isAdmin={profile?.role === "admin"}>
      {children}
    </AppShell>
  );
}
