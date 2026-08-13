import { RANGE_PRESETS, type RangeKey } from "@/lib/date-range";
import type { FunnelStatusFilter } from "@/lib/kommo/aggregate";
import { filterControlClass, filterLabelClass } from "./PeriodFilterForm";

interface Props {
  pipelines: { id: number; name: string }[];
  currentPipelineId: number;
  currentRange: RangeKey;
  currentStatus: FunnelStatusFilter;
}

/** Formulário GET nativo — mesmo padrão de `PeriodFilterForm`, mas com o par de filtros específico desta página (funil + período aberto, sem data personalizada). */
export function FunnelFilterBar({ pipelines, currentPipelineId, currentRange, currentStatus }: Props) {
  return (
    <form
      method="get"
      action="/dashboard/leads"
      className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4"
    >
      {/* Preserva a aba (Todos/Ativos/Fechados) ao aplicar funil/período. */}
      <input type="hidden" name="status" value={currentStatus} />

      <label className={filterLabelClass}>
        Funil
        <select name="pipeline" defaultValue={currentPipelineId} className={filterControlClass}>
          {pipelines.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>

      <label className={filterLabelClass}>
        Período
        <select name="range" defaultValue={currentRange} className={filterControlClass}>
          {Object.entries(RANGE_PRESETS).map(([key, preset]) => (
            <option key={key} value={key}>
              {preset.label}
            </option>
          ))}
        </select>
      </label>

      <div className="flex items-center gap-2">
        <button
          type="submit"
          className="rounded-lg bg-[#2a78d6] px-4 py-2 text-sm font-medium text-white hover:bg-[#2568bd]"
        >
          Aplicar
        </button>
        <a
          href="/dashboard/leads"
          className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm text-[var(--text-secondary)] transition-colors hover:bg-black/5"
        >
          Limpar filtro
        </a>
      </div>
    </form>
  );
}
