"use client";

import {
  BarChart3,
  FileSignature,
  Filter,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Megaphone,
  Workflow,
  XCircle,
} from "lucide-react";
import { NavLink } from "./NavLink";

const links = [
  { href: "/dashboard", label: "Visão geral", icon: LayoutDashboard },
  { href: "/dashboard/leads", label: "Leads e funil", icon: Filter },
  { href: "/dashboard/performance-leads", label: "Performance de leads", icon: Workflow },
  { href: "/dashboard/marketing", label: "Marketing digital", icon: Megaphone },
  { href: "/dashboard/atividades", label: "Atividades", icon: ListChecks },
  { href: "/dashboard/contratos", label: "Contratos", icon: FileSignature },
  { href: "/dashboard/perdas", label: "Perdas", icon: XCircle },
];

export function Sidebar() {
  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-[var(--border)] bg-[var(--surface)] md:flex">
      <div className="flex items-center gap-2 px-5 py-5">
        <BarChart3 className="h-5 w-5 text-[#2a78d6]" />
        <span className="font-semibold">Kommodash</span>
      </div>
      <nav className="flex flex-col gap-1 px-3">
        {links.map((link) => (
          <NavLink key={link.href} {...link} />
        ))}
      </nav>
      <form action="/api/auth/logout" method="POST" className="mt-auto px-3 pb-5">
        <button
          type="submit"
          className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-[var(--text-secondary)] transition hover:bg-[var(--border)]"
        >
          <LogOut className="h-4 w-4" />
          Sair
        </button>
      </form>
    </aside>
  );
}
