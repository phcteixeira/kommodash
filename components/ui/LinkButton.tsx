"use client";

import Link, { useLinkStatus } from "next/link";
import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";

function LinkButtonContent({
  label,
  icon,
  iconPosition,
}: {
  label: string;
  icon: ReactNode;
  iconPosition: "before" | "after";
}) {
  // Só funciona dentro de um filho de <Link> — indica quando ESSA navegação
  // específica está em andamento. Não dependemos do loading.tsx da rota de
  // destino: para links não pré-carregados (ou rotas dinâmicas), o Next.js
  // nem sempre processa o RSC stream de forma incremental o bastante para o
  // fallback aparecer, então damos feedback garantido aqui mesmo.
  const { pending } = useLinkStatus();
  const iconEl = pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : icon;
  return iconPosition === "before" ? (
    <>
      {iconEl}
      {label}
    </>
  ) : (
    <>
      {label}
      {iconEl}
    </>
  );
}

export function LinkButton({
  href,
  label,
  icon,
  iconPosition = "after",
  className,
}: {
  href: string;
  label: string;
  /** Ícone já renderizado (ex.: `<ChevronRight className="h-3.5 w-3.5" />`) — precisa ser um elemento, não o componente, para poder atravessar de um Server Component. */
  icon: ReactNode;
  iconPosition?: "before" | "after";
  className?: string;
}) {
  return (
    <Link href={href} className={className}>
      <LinkButtonContent label={label} icon={icon} iconPosition={iconPosition} />
    </Link>
  );
}
