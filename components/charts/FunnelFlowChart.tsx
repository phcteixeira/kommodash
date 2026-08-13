import { ChevronDown } from "lucide-react";
import { formatNumber, formatPercent } from "@/lib/format";
import { SEQUENTIAL_BLUE } from "@/lib/palette";

export interface FunnelFlowStage {
  key: string;
  label: string;
  /** "leads" na 1ª etapa; nas demais, o item marcado/vinculado — não o lead. */
  unitLabel: string;
  count: number;
  /** % sobre a 1ª etapa. */
  shareOfTotal: number;
  /** % sobre a etapa anterior. null na 1ª etapa. */
  conversionFromPrevious: number | null;
}

interface Props {
  stages: FunnelFlowStage[];
}

// Etapa do funil = posição em uma sequência (ordinal), não uma categoria
// independente — por isso usa um único matiz em degraus de luminosidade,
// não a paleta categórica. Ver skill dataviz (color-formula.md).
const STEP_COLORS = [SEQUENTIAL_BLUE[300], SEQUENTIAL_BLUE[400], SEQUENTIAL_BLUE[500], SEQUENTIAL_BLUE[600]];

export function FunnelFlowChart({ stages }: Props) {
  const maxCount = Math.max(1, ...stages.map((s) => s.count));

  return (
    <div className="flex flex-col">
      {stages.map((stage, i) => {
        // Largura mínima para a barra ficar visível mesmo com contagem baixa.
        const widthPct = Math.max(2, (stage.count / maxCount) * 100);
        const color = STEP_COLORS[i % STEP_COLORS.length];
        const nextConversion = stages[i + 1]?.conversionFromPrevious ?? null;

        return (
          <div key={stage.key}>
            <div
              title={`${stage.label}: ${formatNumber(stage.count)} ${stage.unitLabel} (${formatPercent(stage.shareOfTotal)} da 1ª etapa)`}
            >
              <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
                <span className="font-medium text-[var(--text-primary)]">{stage.label}</span>
                <span className="whitespace-nowrap text-[var(--text-secondary)]">
                  <span className="font-semibold tabular-nums text-[var(--text-primary)]">
                    {formatNumber(stage.count)}
                  </span>{" "}
                  {stage.unitLabel}
                </span>
              </div>
              <div className="h-10 w-full overflow-hidden rounded-md bg-[var(--page)]">
                <div
                  className="h-full rounded-md transition-[width] duration-300 ease-out"
                  style={{ width: `${widthPct}%`, background: color }}
                />
              </div>
            </div>

            {i < stages.length - 1 ? (
              <div className="flex items-center gap-1.5 py-2 pl-1 text-xs text-[var(--muted)]">
                <ChevronDown className="h-3.5 w-3.5" />
                {nextConversion !== null ? <span>{formatPercent(nextConversion)} da etapa anterior</span> : null}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
