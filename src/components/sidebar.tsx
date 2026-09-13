"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, KanbanSquare, Users, Search, Send, Mail, Repeat, BookOpen, Settings, ShieldCheck, LogOut } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/pipeline", label: "Pipeline", icon: KanbanSquare },
  { href: "/leads", label: "Leads", icon: Users },
  { href: "/prospecting", label: "Prospecting", icon: Search },
  { href: "/outreach", label: "Outreach", icon: Send },
  { href: "/sequences", label: "Sequences", icon: Repeat },
  { href: "/templates", label: "Templates", icon: Mail },
  { href: "/playbook", label: "Playbook", icon: BookOpen },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar({ email, isAdmin }: { email: string; isAdmin?: boolean }) {
  const pathname = usePathname();

  return (
    <aside className="glass-panel m-3 flex w-56 shrink-0 flex-col rounded-2xl">
      <div className="px-5 py-5 text-lg font-semibold tracking-tight">Agency OS</div>

      <nav className="flex-1 space-y-1 px-3">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                active ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Icon size={18} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-200 p-3">
        {isAdmin && (
          <Link
            href="/admin"
            className={`mb-1 flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
              pathname.startsWith("/admin") ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <ShieldCheck size={18} />
            Access
          </Link>
        )}
        <ThemeToggle />
        <div className="truncate px-3 pb-2 text-xs text-slate-400">{email}</div>
        <form action="/auth/signout" method="post">
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            <LogOut size={18} />
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}
