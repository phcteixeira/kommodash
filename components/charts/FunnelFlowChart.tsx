import { ArrowDown, ArrowUp } from "lucide-react";
import { formatNumber, formatPercent } from "@/lib/format";
import { SEQUENTIAL_BLUE, STATUS } from "@/lib/palette";

export interface FunnelFlowStage {
  key: string;
  label: string;
  unitLabel: string;
  count: number;
  /** % sobre a 1ª etapa recebida (a base do grupo — ver LeadFunnelStage.shareOfTotal). */
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
const STEP_COLORS = [SEQUENTIAL_BLUE[400], SEQUENTIAL_BLUE[500], SEQUENTIAL_BLUE[600]];

const BAR_AREA_HEIGHT = 200; // px
const AXIS_WIDTH = 44; // px — largura reservada para os rótulos do eixo Y
const BAR_MAX_WIDTH = 72; // px — barra "encorpada" (chart hero), não a barra fina de comparação padrão

export function FunnelFlowChart({ stages }: Props) {
  const maxCount = Math.max(1, ...stages.map((s) => s.count));
  const gridCols = { gridTemplateColumns: `repeat(${stages.length}, 1fr)` };

  return (
    <div>
      {/* Cabeçalho de cada coluna: nº da etapa, nome e % sobre a 1ª etapa do grupo. */}
      <div className="grid gap-4" style={{ ...gridCols, paddingLeft: AXIS_WIDTH }}>
        {stages.map((stage, i) => (
          <div key={stage.key} className={i > 0 ? "border-l border-[var(--border)] pl-4" : ""}>
            <div className="text-xs text-[var(--muted)]">Etapa {i + 1}</div>
            <div className="mt-0.5 flex items-baseline justify-between gap-2">
              <span
                className="truncate text-sm font-medium text-[var(--text-primary)]"
                title={stage.label}
              >
                {stage.label}
              </span>
              <span className="whitespace-nowrap text-lg font-semibold tabular-nums text-[var(--text-primary)]">
                {formatPercent(stage.shareOfTotal)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Área do gráfico: eixo Y compartilhado + barras verticais, mesmo sistema de coordenadas. */}
      <div className="relative mt-3" style={{ height: BAR_AREA_HEIGHT }}>
        {[0, 0.5, 1].map((f) => (
          <div key={f} className="absolute left-0 right-0 flex items-center" style={{ top: `${(1 - f) * 100}%` }}>
            <span
              className="shrink-0 pr-2 text-right text-xs tabular-nums text-[var(--muted)]"
              style={{ width: AXIS_WIDTH }}
            >
              {formatNumber(Math.round(maxCount * f))}
            </span>
            <div className="h-px flex-1 bg-[var(--border)]" />
          </div>
        ))}

        <div className="absolute top-0 bottom-0 right-0 grid gap-4" style={{ ...gridCols, left: AXIS_WIDTH }}>
          {stages.map((stage, i) => {
            const heightPct = Math.max(1, (stage.count / maxCount) * 100);
            const color = STEP_COLORS[i % STEP_COLORS.length];
            return (
              <div key={stage.key} className="flex items-end justify-center">
                <div
                  className="rounded-t-md transition-[height] duration-300 ease-out"
                  style={{ height: `${heightPct}%`, width: BAR_MAX_WIDTH, background: color }}
                  title={`${stage.label}: ${formatNumber(stage.count)} ${stage.unitLabel} (${formatPercent(stage.shareOfTotal)})`}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Valor absoluto de cada etapa, sob a barra. */}
      <div className="grid gap-4" style={{ ...gridCols, paddingLeft: AXIS_WIDTH }}>
        {stages.map((stage, i) => (
          <div key={stage.key} className={`pt-2 text-center ${i > 0 ? "border-l border-[var(--border)]" : ""}`}>
            <span className="font-semibold tabular-nums text-[var(--text-primary)]">{formatNumber(stage.count)}</span>{" "}
            <span className="text-[var(--text-secondary)]">{stage.unitLabel}</span>
          </div>
        ))}
      </div>

      {/* Conectores de queda entre etapas — cor de status reservada (crítico), sempre com ícone + rótulo. */}
      <div className="mt-3 grid gap-4" style={{ ...gridCols, paddingLeft: AXIS_WIDTH }}>
        {stages.map((stage, i) => (
          <div key={stage.key} className={i > 0 ? "border-l border-[var(--border)] pl-4" : ""}>
            {i > 0 ? <DropIndicator previous={stages[i - 1]} current={stage} /> : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function DropIndicator({ previous, current }: { previous: FunnelFlowStage; current: FunnelFlowStage }) {
  const drop = previous.count - current.count;
  const dropRate = previous.count > 0 ? drop / previous.count : 0;

  if (drop >= 0) {
    return (
      <div className="flex items-center gap-1.5 text-xs" style={{ color: STATUS.critical }}>
        <ArrowDown className="h-3.5 w-3.5" />
        <span>
          {formatNumber(drop)} caíram ({formatPercent(dropRate)})
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 text-xs" style={{ color: STATUS.good }}>
      <ArrowUp className="h-3.5 w-3.5" />
      <span>
        +{formatNumber(-drop)} ({formatPercent(-dropRate)})
      </span>
    </div>
  );
}
