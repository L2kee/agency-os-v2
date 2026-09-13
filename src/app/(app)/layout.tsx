import { hasSupabaseEnv } from "@/server/supabase/env";
import { requireUser } from "@/server/auth";
import { Sidebar } from "@/components/sidebar";
import { SetupNotice } from "@/components/setup-notice";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  if (!hasSupabaseEnv) return <SetupNotice />;

  const { user, profile } = await requireUser();

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar email={user.email ?? ""} isAdmin={profile?.role === "admin"} />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
