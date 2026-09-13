import { requireUser } from "@/server/auth";
import { getSendingAccount, hasEncryptionKey, envSender } from "@/server/sending-accounts";
import { AppearanceSettings } from "./appearance-settings";
import { EmailSettings } from "./email-settings";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const { user } = await requireUser();
  const account = await getSendingAccount();
  const fallback = envSender();

  return (
    <div className="mx-auto max-w-2xl p-8">
      <h1 className="text-2xl font-semibold">Settings</h1>
      <p className="mt-1 text-sm text-slate-500">How the app looks, and how your outreach emails are sent.</p>

      <div className="mt-6">
        <AppearanceSettings />
      </div>

      <div className="mt-6">
        <EmailSettings
          account={account}
          accountEmail={user.email ?? ""}
          usingFallback={!account && Boolean(fallback)}
          fallbackFrom={fallback?.fromEmail ?? null}
          encryptionReady={hasEncryptionKey}
        />
      </div>
    </div>
  );
}
