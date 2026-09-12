"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, AlertCircle, Mail } from "lucide-react";
import type { SendingAccount } from "@/server/sending-accounts/types";
import { saveSendingAccount, sendTestEmail, disconnectSendingAccount } from "@/server/sending-accounts/actions";

type Account = (SendingAccount & { hasKey: boolean }) | null;

const FIELD =
  "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900";

export function EmailSettings({
  account,
  accountEmail,
  usingFallback,
  fallbackFrom,
  encryptionReady,
}: {
  account: Account;
  accountEmail: string;
  usingFallback: boolean;
  fallbackFrom: string | null;
  encryptionReady: boolean;
}) {
  const [fromName, setFromName] = useState(account?.from_name ?? "");
  const [fromEmail, setFromEmail] = useState(account?.from_email ?? "");
  const [apiKey, setApiKey] = useState("");
  const [msg, setMsg] = useState<{ ok?: string; err?: string } | null>(null);
  const [saving, startSave] = useTransition();
  const [testing, startTest] = useTransition();
  const [disconnecting, startDisconnect] = useTransition();

  function save() {
    setMsg(null);
    startSave(async () => {
      const res = await saveSendingAccount({ fromName, fromEmail, apiKey });
      if (res?.error) setMsg({ err: res.error });
      else {
        setApiKey("");
        setMsg({ ok: "Saved. Send a test to confirm it works." });
      }
    });
  }

  function test() {
    setMsg(null);
    startTest(async () => {
      const res = await sendTestEmail();
      if (res?.error) setMsg({ err: res.error });
      else setMsg({ ok: `Test email sent to ${res?.sentTo}. Check your inbox.` });
    });
  }

  return (
    <div className="space-y-5">
      {!encryptionReady && (
        <div className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">
          The server is missing <code>APP_ENCRYPTION_KEY</code>, so API keys can&rsquo;t be stored securely.
          Add it to <code>.env.local</code> (see <code>.env.local.example</code>) and restart.
        </div>
      )}

      {account ? (
        <StatusBanner account={account} />
      ) : usingFallback ? (
        <div className="rounded-lg bg-slate-100 p-3 text-sm text-slate-600">
          Currently sending through the app&rsquo;s shared address{fallbackFrom ? ` (${fallbackFrom})` : ""}.
          Set up your own below so emails come from you.
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
          <AlertCircle size={16} /> No sending set up — outreach won&rsquo;t send until you connect an
          email provider.
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex items-center gap-2">
          <Mail size={16} className="text-slate-400" />
          <h2 className="font-semibold">Resend (API key)</h2>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          Sign up at{" "}
          <a href="https://resend.com" target="_blank" rel="noreferrer" className="underline">
            resend.com
          </a>
          , verify a domain you own (add the DNS records they give you), then create an API key. Emails
          will come from an address on that domain.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">From name</span>
            <input
              value={fromName}
              onChange={(e) => setFromName(e.target.value)}
              placeholder="Jordan at Pixel Studio"
              className={FIELD}
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">From address</span>
            <input
              value={fromEmail}
              onChange={(e) => setFromEmail(e.target.value)}
              placeholder="jordan@yourdomain.com"
              className={FIELD}
            />
          </label>
        </div>

        <label className="mt-3 block">
          <span className="text-sm font-medium text-slate-700">Resend API key</span>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={account?.hasKey ? "•••••••••• (leave blank to keep current)" : "re_…"}
            className={FIELD}
          />
        </label>

        {msg?.err && <p className="mt-3 text-sm text-rose-600">{msg.err}</p>}
        {msg?.ok && <p className="mt-3 text-sm text-emerald-600">{msg.ok}</p>}

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={save}
            disabled={saving || !encryptionReady}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
          {account && (
            <button
              onClick={test}
              disabled={testing}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
            >
              {testing ? "Sending…" : `Send test to ${accountEmail}`}
            </button>
          )}
          {account && (
            <button
              onClick={() => startDisconnect(() => disconnectSendingAccount().then(() => {}))}
              disabled={disconnecting}
              className="ml-auto rounded-lg px-3 py-2 text-sm text-rose-600 hover:bg-rose-50 disabled:opacity-50"
            >
              {disconnecting ? "Disconnecting…" : "Disconnect"}
            </button>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-dashed border-slate-300 p-5 text-sm text-slate-500">
        <strong className="text-slate-700">Coming soon:</strong> connect Gmail or Outlook directly (no
        DNS setup, sends from your real mailbox).
      </div>
    </div>
  );
}

function StatusBanner({ account }: { account: SendingAccount }) {
  if (account.status === "active") {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">
        <CheckCircle2 size={16} /> Sending as <strong>{account.from_email}</strong> — verified and working.
      </div>
    );
  }
  return (
    <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
      <div className="flex items-center gap-2">
        <AlertCircle size={16} />
        {account.status === "needs_auth"
          ? "Last send failed — check the key and domain."
          : "Saved but not tested yet — send a test email."}
      </div>
      {account.last_error && <p className="mt-1 text-xs text-amber-700">{account.last_error}</p>}
    </div>
  );
}
