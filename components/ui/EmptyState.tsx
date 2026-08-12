import { AlertTriangle, PlugZap } from "lucide-react";

interface EmptyStateProps {
  variant: "not-configured" | "error";
  message?: string | null;
}

export function EmptyState({ variant, message }: EmptyStateProps) {
  const isError = variant === "error";
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6">
      <div className="flex items-start gap-3">
        <div
          className={`rounded-full p-2 ${
            isError ? "bg-[#d03b3b]/10 text-[#d03b3b]" : "bg-[#2a78d6]/10 text-[#2a78d6]"
          }`}
        >
          {isError ? <AlertTriangle className="h-5 w-5" /> : <PlugZap className="h-5 w-5" />}
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-[var(--text-primary)]">
            {isError ? "Erro ao conectar com a Kommo" : "Kommo ainda não conectado"}
          </h3>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            {message ??
              "Configure as variáveis de ambiente KOMMO_SUBDOMAIN e KOMMO_ACCESS_TOKEN para ver dados reais da sua conta."}
          </p>
          <ol className="mt-3 list-decimal space-y-1 pl-4 text-sm text-[var(--text-secondary)]">
            <li>
              No Kommo, acesse <strong>Ajustes → Integrações → Criar integração</strong>.
            </li>
            <li>
              Na aba <strong>Chaves e escopos</strong>, gere um <strong>token de longa duração</strong>.
            </li>
            <li>
              Defina <code className="rounded bg-black/5 px-1 py-0.5">KOMMO_SUBDOMAIN</code> (ex.: se a
              URL é <code className="rounded bg-black/5 px-1 py-0.5">suaempresa.kommo.com</code>, use{" "}
              <code className="rounded bg-black/5 px-1 py-0.5">suaempresa</code>) e{" "}
              <code className="rounded bg-black/5 px-1 py-0.5">KOMMO_ACCESS_TOKEN</code> no arquivo{" "}
              <code className="rounded bg-black/5 px-1 py-0.5">.env.local</code>.
            </li>
            <li>Reinicie a aplicação.</li>
          </ol>
          <p className="mt-3 text-xs text-[var(--muted)]">
            Enquanto isso, os relatórios abaixo mostram dados de demonstração.
          </p>
        </div>
      </div>
    </div>
  );
}
