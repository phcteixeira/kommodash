import type { FunnelStatusFilter } from "@/lib/kommo/aggregate";

const TABS: { key: FunnelStatusFilter; label: string }[] = [
  { key: "all", label: "Todos os" },
  { key: "active", label: "Ativos" },
  { key: "closed", label: "Fechados" },
];

interface Props {
  current: FunnelStatusFilter;
  pipelineId: number;
  range: string;
  /** Só presentes (e incluídos no link) quando `range === "custom"`. */
  from?: string;
  to?: string;
}

/** Abas de navegação simples (links puros) — trocam só a aba, preservando funil/período (incl. data personalizada) atuais. */
export function FunnelStatusTabs({ current, pipelineId, range, from, to }: Props) {
  return (
    <div className="mb-4 flex gap-5 border-b border-[var(--border)]">
      {TABS.map((tab) => {
        const params = new URLSearchParams({ pipeline: String(pipelineId), range, status: tab.key });
        if (range === "custom") {
          if (from) params.set("from", from);
          if (to) params.set("to", to);
        }
        const active = tab.key === current;
        return (
          <a
            key={tab.key}
            href={`/dashboard/leads?${params.toString()}`}
            className={`-mb-px border-b-2 px-1 pb-2 text-sm font-medium uppercase tracking-wide transition-colors ${
              active
                ? "border-[#2a78d6] text-[#2a78d6]"
                : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            {tab.label}
          </a>
        );
      })}
    </div>
  );
}
