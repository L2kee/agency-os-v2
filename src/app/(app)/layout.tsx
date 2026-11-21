import { hasSupabaseEnv } from "@/server/supabase/env";
import { isOrgAdmin, requireUser } from "@/server/auth";
import { AppShell } from "@/components/app-shell";
import { SetupNotice } from "@/components/setup-notice";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  if (!hasSupabaseEnv) return <SetupNotice />;

  const { user, org } = await requireUser();

  return (
    <AppShell email={user.email ?? ""} orgName={org.name} isAdmin={isOrgAdmin(org)}>
      {children}
    </AppShell>
  );
}
