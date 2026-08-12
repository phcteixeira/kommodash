"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { Loader2, type LucideIcon } from "lucide-react";

function NavLinkContent({ label, icon: Icon }: { label: string; icon: LucideIcon }) {
  // Só funciona dentro de um filho de <Link> — indica quando ESTE link
  // específico está com a navegação em andamento.
  const { pending } = useLinkStatus();
  return (
    <>
      <Icon className="h-4 w-4 shrink-0" />
      <span className="flex-1">{label}</span>
      {pending ? <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-[#2a78d6]" /> : null}
    </>
  );
}

export function NavLink({ href, label, icon }: { href: string; label: string; icon: LucideIcon }) {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
        isActive
          ? "bg-[#2a78d6]/10 font-medium text-[#2a78d6]"
          : "text-[var(--text-secondary)] hover:bg-black/5 hover:text-[var(--text-primary)]"
      }`}
    >
      <NavLinkContent label={label} icon={icon} />
    </Link>
  );
}
