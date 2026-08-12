"use client";

import { useState } from "react";
import { CLOSINGS_PERIODS, type ClosingsPeriodKey } from "@/lib/date-range";

interface ProductOption {
  id: number;
  name: string;
}

interface Props {
  currentPeriod: ClosingsPeriodKey;
  currentFrom: string;
  currentTo: string;
  products: ProductOption[];
  currentProductId: string; // "all" ou o id do produto como string
}

const controlClass =
  "rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-sm text-[var(--text-primary)]";
const labelClass = "flex flex-col gap-1 text-sm text-[var(--text-secondary)]";

/**
 * Formulário GET nativo (sem JS de navegação): o próprio navegador monta a
 * query string a partir dos campos `name=` e recarrega a página com os
 * parâmetros escolhidos. Evita lidar com client-router/transitions à mão —
 * o Suspense de `app/dashboard/loading.tsx` já cobre o feedback de carregamento.
 */
export function ContratosFilterBar({ currentPeriod, currentFrom, currentTo, products, currentProductId }: Props) {
  // Só para alternar a visibilidade dos campos de data personalizada — não navega.
  const [period, setPeriod] = useState<ClosingsPeriodKey>(currentPeriod);

  return (
    <form
      method="get"
      action="/dashboard/contratos"
      className="mb-6 flex flex-wrap items-end gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4"
    >
      <label className={labelClass}>
        Período
        <select
          name="period"
          defaultValue={currentPeriod}
          onChange={(e) => setPeriod(e.target.value as ClosingsPeriodKey)}
          className={controlClass}
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
          <label className={labelClass}>
            De
            <input type="date" name="from" defaultValue={currentFrom} className={controlClass} />
          </label>
          <label className={labelClass}>
            Até
            <input type="date" name="to" defaultValue={currentTo} className={controlClass} />
          </label>
        </>
      ) : null}

      <label className={labelClass}>
        Produto
        <select name="product" defaultValue={currentProductId === "all" ? "" : currentProductId} className={controlClass}>
          <option value="">Todos os produtos</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
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
          href="/dashboard/contratos"
          className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm text-[var(--text-secondary)] transition-colors hover:bg-black/5"
        >
          Limpar filtro
        </a>
      </div>
    </form>
  );
}
