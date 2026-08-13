import { loadFunnelEvents, loadKommoDataset } from "@/lib/kommo/dataset";
import { buildFunnelConversion, type FunnelStatusFilter } from "@/lib/kommo/aggregate";
import { resolveRange } from "@/lib/date-range";
import { formatDays, formatNumber, formatPercent } from "@/lib/format";
import { PageHeader } from "@/components/layout/PageHeader";
import { FunnelFilterBar } from "@/components/filters/FunnelFilterBar";
import { FunnelStatusTabs } from "@/components/filters/FunnelStatusTabs";
import { EmptyState } from "@/components/ui/EmptyState";
import { KpiCard } from "@/components/ui/KpiCard";
import { FunnelWaterfallChart } from "@/components/charts/FunnelWaterfallChart";
import { AlertTriangle, Timer, TrendingDown, Users } from "lucide-react";

function isStatusFilter(value?: string): value is FunnelStatusFilter {
  return value === "all" || value === "active" || value === "closed";
}

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ pipeline?: string; range?: string; status?: string }>;
}) {
  const { pipeline, range, status } = await searchParams;
  const { key: rangeKey, from } = resolveRange(range);
  const statusFilter: FunnelStatusFilter = isStatusFilter(status) ? status : "all";

  const [{ dataset, isDemo: datasetIsDemo, error: datasetError }, funnelEventsResult] = await Promise.all([
    loadKommoDataset({ createdFrom: from }),
    loadFunnelEvents(from),
  ]);
  const { leads, pipelines } = dataset;

  const isDemo = datasetIsDemo || funnelEventsResult.isDemo;
  const error = datasetError ?? funnelEventsResult.error;

  const selectedPipeline = pipelines.find((p) => p.id === Number(pipeline)) ?? pipelines[0];
  const report = selectedPipeline
    ? buildFunnelConversion(leads, funnelEventsResult.events, selectedPipeline, statusFilter, from)
    : null;

  return (
    <div>
      <PageHeader
        title="Leads e funil"
        description="Taxa de avanço e tempo de permanência entre as etapas do funil selecionado."
      />

      {isDemo ? <div className="mb-6"><EmptyState variant={error ? "error" : "not-configured"} message={error} /></div> : null}

      {selectedPipeline && report ? (
        <>
          <FunnelStatusTabs current={statusFilter} pipelineId={selectedPipeline.id} range={rangeKey} />

          <FunnelFilterBar
            pipelines={pipelines.map((p) => ({ id: p.id, name: p.name }))}
            currentPipelineId={selectedPipeline.id}
            currentRange={rangeKey}
            currentStatus={statusFilter}
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <KpiCard label="Leads no funil" value={formatNumber(report.totalLeadsInScope)} icon={Users} />
            <KpiCard
              label="Ciclo de vida médio"
              value={report.avgLifecycleDays !== null ? formatDays(report.avgLifecycleDays) : "—"}
              icon={Timer}
              hint="Da criação até o fechamento (ganho ou perdido)"
            />
            <KpiCard
              label="Perdidos no funil"
              value={formatPercent(report.lost.shareOfFirstStage)}
              icon={TrendingDown}
              accent={report.lost.count > 0 ? "critical" : "neutral"}
              hint={`${formatNumber(report.lost.count)} leads`}
            />
          </div>

          {report.bottleneck.biggestDrop || report.bottleneck.longestDwell ? (
            <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-medium text-[var(--text-primary)]">
                <AlertTriangle className="h-4 w-4 text-[#eda100]" />
                Gargalo do funil
              </div>
              <div className="flex flex-col gap-1 text-sm text-[var(--text-secondary)]">
                {report.bottleneck.biggestDrop ? (
                  <div>
                    Maior queda:{" "}
                    <span className="font-medium text-[var(--text-primary)]">
                      {report.bottleneck.biggestDrop.stageName}
                    </span>{" "}
                    ({formatPercent(report.bottleneck.biggestDrop.dropRate)} em relação à etapa anterior)
                  </div>
                ) : null}
                {report.bottleneck.longestDwell ? (
                  <div>
                    Maior permanência:{" "}
                    <span className="font-medium text-[var(--text-primary)]">
                      {report.bottleneck.longestDwell.stageName}
                    </span>{" "}
                    ({formatDays(report.bottleneck.longestDwell.avgDays)} em média)
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          <div className="mt-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
            <FunnelWaterfallChart stages={report.stages} lost={report.lost} />
          </div>
        </>
      ) : (
        <p className="text-sm text-[var(--muted)]">Nenhum funil encontrado.</p>
      )}
    </div>
  );
}
