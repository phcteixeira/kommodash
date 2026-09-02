"use client";

import { useState } from "react";
import Link from "next/link";
import { FUNNEL_RANGE_PRESETS, type FunnelRangeKey } from "@/lib/date-range";
import { filterControlClass, filterLabelClass } from "./PeriodFilterForm";

interface Props {
  pipelines: { id: number; name: string }[];
  currentPipelineId: number;
  currentRange: FunnelRangeKey;
  currentFrom: string;
  currentTo: string;
}

/** Formulário GET nativo — mesmo padrão de `PeriodFilterForm`, com o par funil + período (incl. data personalizada) desta página. */
export function FunnelFilterBar({
  pipelines,
  currentPipelineId,
  currentRange,
  currentFrom,
  currentTo,
}: Props) {
  // Só para alternar a visibilidade dos campos de data personalizada — não navega.
  const [range, setRange] = useState<FunnelRangeKey>(currentRange);

  return (
    <form
      method="get"
      action="/dashboard/leads"
      className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4"
    >
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
        <select
          name="range"
          defaultValue={currentRange}
          onChange={(e) => setRange(e.target.value as FunnelRangeKey)}
          className={filterControlClass}
        >
          {Object.entries(FUNNEL_RANGE_PRESETS).map(([key, preset]) => (
            <option key={key} value={key}>
              {preset.label}
            </option>
          ))}
        </select>
      </label>

      {range === "custom" ? (
        <>
          <label className={filterLabelClass}>
            De
            <input type="date" name="from" defaultValue={currentFrom} className={filterControlClass} />
          </label>
          <label className={filterLabelClass}>
            Até
            <input type="date" name="to" defaultValue={currentTo} className={filterControlClass} />
          </label>
        </>
      ) : null}

      <div className="flex items-center gap-2">
        <button
          type="submit"
          className="rounded-lg bg-[#2a78d6] px-4 py-2 text-sm font-medium text-white hover:bg-[#2568bd]"
        >
          Aplicar
        </button>
        <Link
          href="/dashboard/leads"
          className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm text-[var(--text-secondary)] transition-colors hover:bg-black/5"
        >
          Limpar filtro
        </Link>
      </div>
    </form>
  );
}
