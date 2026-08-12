"use client";

import { useState, type ReactNode } from "react";
import { CLOSINGS_PERIODS, type ClosingsPeriodKey } from "@/lib/date-range";

interface Props {
  /** Caminho da página (ex.: "/dashboard/perdas") — destino do form e do link "Limpar filtro". */
  action: string;
  currentPeriod: ClosingsPeriodKey;
  currentFrom: string;
  currentTo: string;
  /** Campos extras específicos da página (ex.: o select de Produto em Contratos), renderizados antes dos botões. */
  children?: ReactNode;
}

export const filterControlClass =
  "rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-sm text-[var(--text-primary)]";
export const filterLabelClass = "flex flex-col gap-1 text-sm text-[var(--text-secondary)]";

/**
 * Formulário GET nativo (sem JS de navegação): o próprio navegador monta a
 * query string a partir dos campos `name=` e recarrega a página com os
 * parâmetros escolhidos. Evita lidar com client-router/transitions à mão —
 * o Suspense de `app/dashboard/loading.tsx` já cobre o feedback de carregamento.
 *
 * Base compartilhada do filtro de período (Contratos, Perdas, ...) — campos
 * específicos de cada página entram via `children`.
 */
export function PeriodFilterForm({ action, currentPeriod, currentFrom, currentTo, children }: Props) {
  // Só para alternar a visibilidade dos campos de data personalizada — não navega.
  const [period, setPeriod] = useState<ClosingsPeriodKey>(currentPeriod);

  return (
    <form
      method="get"
      action={action}
      className="mb-6 flex flex-wrap items-end gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4"
    >
      <label className={filterLabelClass}>
        Período
        <select
          name="period"
          defaultValue={currentPeriod}
          onChange={(e) => setPeriod(e.target.value as ClosingsPeriodKey)}
          className={filterControlClass}
        >
          {Object.entries(CLOSINGS_PERIODS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </label>

      {period === "custom" ? (
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

      {children}

      <div className="flex items-center gap-2">
        <button
          type="submit"
          className="rounded-lg bg-[#2a78d6] px-4 py-2 text-sm font-medium text-white hover:bg-[#2568bd]"
        >
          Aplicar
        </button>
        <a
          href={action}
          className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm text-[var(--text-secondary)] transition-colors hover:bg-black/5"
        >
          Limpar filtro
        </a>
      </div>
    </form>
  );
}
