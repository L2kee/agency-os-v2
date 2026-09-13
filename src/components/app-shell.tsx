"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Sidebar } from "@/components/sidebar";

export function AppShell({
  email,
  isAdmin,
  children,
}: {
  email: string;
  isAdmin?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
      {open && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/40 md:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      <div
        className={`fixed inset-y-0 left-0 z-50 w-56 p-3 transition-transform duration-200 ease-out md:static md:z-auto md:w-auto md:translate-x-0 md:p-0 ${
          open ? "translate-x-0" : "-translate-x-[110%]"
        }`}
      >
        <Sidebar email={email} isAdmin={isAdmin} onNavigate={() => setOpen(false)} />
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="glass-panel m-3 mb-0 flex items-center justify-between rounded-2xl px-4 py-3 md:hidden">
          <span className="text-lg font-semibold tracking-tight">Agency OS</span>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Close menu" : "Open menu"}
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
        <main className="min-w-0 flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
