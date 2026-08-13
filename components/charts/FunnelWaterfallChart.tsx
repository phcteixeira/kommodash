import { ChevronDown } from "lucide-react";
import { formatDays, formatNumber, formatPercent } from "@/lib/format";
import { SEQUENTIAL_BLUE, STATUS } from "@/lib/palette";
import type { FunnelStageRow } from "@/lib/kommo/aggregate";

const BLUE_STEPS = [100, 200, 300, 400, 500, 600, 700] as const;

interface Props {
  stages: FunnelStageRow[];
  lost: { count: number; shareOfFirstStage: number };
}

/** Cor por posição na sequência (ordinal) — não por identidade da etapa. Ver skill dataviz. */
function colorForIndex(i: number, total: number): string {
  const stepIndex = total <= 1 ? 0 : Math.round((i / (total - 1)) * (BLUE_STEPS.length - 1));
  return SEQUENTIAL_BLUE[BLUE_STEPS[stepIndex]];
}

export function FunnelWaterfallChart({ stages, lost }: Props) {
  const firstCount = stages[0]?.reachedCount ?? 0;

  return (
    <div>
      <div className="flex flex-col">
        {stages.map((stage, i) => {
          const widthPct = firstCount > 0 ? Math.max(2, (stage.reachedCount / firstCount) * 100) : 0;
          const color = colorForIndex(i, stages.length);

          return (
            <div key={stage.statusId}>
              {i > 0 && stage.avgDaysInPreviousStage !== null ? (
                <div className="flex items-center gap-1.5 py-1.5 pl-1 text-xs text-[var(--muted)]">
                  <ChevronDown className="h-3.5 w-3.5" />
                  <span>{formatDays(stage.avgDaysInPreviousStage)} de permanência média na etapa anterior</span>
                </div>
              ) : null}

              <div className="flex items-center gap-4">
                <div className="flex min-w-0 flex-1 items-center justify-end gap-3">
                  <span className="whitespace-nowrap text-sm font-medium tabular-nums text-[var(--text-secondary)]">
                    {formatPercent(stage.shareOfFirstStage)}
                  </span>
                  <div
                    className="h-8 rounded-l-md transition-[width] duration-300 ease-out"
                    style={{ width: `${widthPct}%`, background: color }}
                    title={`${stage.name}: ${formatNumber(stage.reachedCount)} leads (${formatPercent(stage.shareOfFirstStage)})`}
                  />
                </div>
                <div className="w-56 shrink-0">
                  <div className="truncate text-sm font-medium text-[var(--text-primary)]" title={stage.name}>
                    {stage.name}
                  </div>
                  <div className="text-xs text-[var(--muted)]">{formatNumber(stage.reachedCount)} leads</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* "Perdido" fica separado — não é uma etapa sequencial, pode acontecer a partir de qualquer etapa regular. */}
      <div className="mt-6 flex items-center gap-4 border-t border-dashed border-[var(--border)] pt-4">
        <div className="flex min-w-0 flex-1 items-center justify-end gap-3">
          <span className="whitespace-nowrap text-sm font-medium tabular-nums text-[var(--text-secondary)]">
            {formatPercent(lost.shareOfFirstStage)}
          </span>
          <div
            className="h-8 rounded-l-md"
            style={{ width: `${firstCount > 0 ? Math.max(2, (lost.count / firstCount) * 100) : 0}%`, background: STATUS.critical }}
            title={`Perdido: ${formatNumber(lost.count)} leads (${formatPercent(lost.shareOfFirstStage)})`}
          />
        </div>
        <div className="w-56 shrink-0">
          <div className="text-sm font-medium text-[var(--text-primary)]">Perdido</div>
          <div className="text-xs text-[var(--muted)]">{formatNumber(lost.count)} leads</div>
        </div>
      </div>
    </div>
  );
}
