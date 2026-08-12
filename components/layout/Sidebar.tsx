"use client";

import {
  BarChart3,
  FileSignature,
  Filter,
  LayoutDashboard,
  ListChecks,
  Package,
  Users,
  Wallet,
} from "lucide-react";
import { NavLink } from "./NavLink";

const links = [
  { href: "/dashboard", label: "Visão geral", icon: LayoutDashboard },
  { href: "/dashboard/leads", label: "Leads e funil", icon: Filter },
  { href: "/dashboard/vendedores", label: "Vendedores", icon: Users },
  { href: "/dashboard/faturamento", label: "Faturamento", icon: Wallet },
  { href: "/dashboard/atividades", label: "Atividades", icon: ListChecks },
  { href: "/dashboard/contratos", label: "Contratos", icon: FileSignature },
  { href: "/dashboard/produtos", label: "Produtos e campos", icon: Package },
];

export function Sidebar() {
  return (
    <aside className="hidden w-60 shrink-0 border-r border-[var(--border)] bg-[var(--surface)] md:block">
      <div className="flex items-center gap-2 px-5 py-5">
        <BarChart3 className="h-5 w-5 text-[#2a78d6]" />
        <span className="font-semibold">Kommodash</span>
      </div>
      <nav className="flex flex-col gap-1 px-3">
        {links.map((link) => (
          <NavLink key={link.href} {...link} />
        ))}
      </nav>
    </aside>
  );
}
