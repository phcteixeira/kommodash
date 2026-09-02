import { loadFunnelEvents, loadKommoDataset, resolveLeadsByIds } from "@/lib/kommo/dataset";
import { buildFunnelActivity } from "@/lib/kommo/aggregate";
import { resolveFunnelRange, toDateInputValue } from "@/lib/date-range";
import { formatDate, formatDays, formatNumber, formatPercent } from "@/lib/format";
import { PageHeader } from "@/components/layout/PageHeader";
import { FunnelFilterBar } from "@/components/filters/FunnelFilterBar";
import { EmptyState } from "@/components/ui/EmptyState";
import { KpiCard } from "@/components/ui/KpiCard";
import { FunnelWaterfallChart } from "@/components/charts/FunnelWaterfallChart";
import { AlertTriangle, Trophy, TrendingDown, Timer, Sparkles, History } from "lucide-react";

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ pipeline?: string; range?: string; from?: string; to?: string }>;
}) {
  const { pipeline, range, from: fromParam, to: toParam } = await searchParams;
  const { key: rangeKey, from, to } = resolveFunnelRange({ range, from: fromParam, to: toParam });
  // `from`/`to` podem vir undefined (preset "todo o período" não tem nenhum
  // dos dois; presets de N dias não têm `to`) — pros eventos, precisamos de
  // uma janela concreta pra filtrar localmente por timestamp.
  const window = { from: from ?? new Date(0), to: to ?? new Date() };

  const [{ dataset, isDemo: datasetIsDemo, error: datasetError }, funnelEventsResult] = await Promise.all([
    loadKommoDataset({ createdFrom: from, createdTo: to }),
    loadFunnelEvents(window.from, window.to),
  ]);
  const { leads, pipelines } = dataset;

  const isDemo = datasetIsDemo || funnelEventsResult.isDemo;
  const error = datasetError ?? funnelEventsResult.error;

  const selectedPipeline = pipelines.find((p) => p.id === Number(pipeline)) ?? pipelines[0];

  // `leads` só cobre quem foi CRIADO na janela (filtro do dataset) — um lead
  // criado antes que só avançou de etapa agora não está nele. Completa com
  // os leads referenciados pelos eventos do período que ainda faltarem.
  const relevantEvents = selectedPipeline
    ? funnelEventsResult.events.filter(
        (e) =>
          e.pipelineId === selectedPipeline.id &&
          e.changedAt >= Math.floor(window.from.getTime() / 1000) &&
          e.changedAt <= Math.floor(window.to.getTime() / 1000)
      )
    : [];
  const leadById = await resolveLeadsByIds(
    leads,
    relevantEvents.map((e) => e.leadId)
  );

  const report = selectedPipeline
    ? buildFunnelActivity(leadById, funnelEventsResult.events, selectedPipeline, window)
    : null;

  const firstStageCount = report?.stages[0]?.reachedCount ?? 0;
  const lost = report
    ? { count: report.lostCount, shareOfFirstStage: firstStageCount > 0 ? report.lostCount / firstStageCount : 0 }
    : { count: 0, shareOfFirstStage: 0 };

  return (
    <div>
      <PageHeader
        title="Leads e funil"
        description="Quantos leads avançaram por cada etapa do funil dentro do período selecionado — não importa quando o lead foi criado."
      />

      {isDemo ? <div className="mb-6"><EmptyState variant={error ? "error" : "not-configured"} message={error} /></div> : null}

      {selectedPipeline && report ? (
        <>
          <FunnelFilterBar
            pipelines={pipelines.map((p) => ({ id: p.id, name: p.name }))}
            currentPipelineId={selectedPipeline.id}
            currentRange={rangeKey}
            currentFrom={from ? toDateInputValue(from) : ""}
            currentTo={to ? toDateInputValue(to) : ""}
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <KpiCard label="Ganhos" value={formatNumber(report.wonCount)} icon={Trophy} accent="good" />
            <KpiCard
              label="Perdidos"
              value={formatNumber(report.lostCount)}
              icon={TrendingDown}
              accent={report.lostCount > 0 ? "critical" : "neutral"}
            />
            <KpiCard
              label="Lead mais novo"
              value={report.newestLeadCreatedAt !== null ? formatDate(report.newestLeadCreatedAt) : "—"}
              icon={Sparkles}
              hint="Data de criação"
            />
            <KpiCard
              label="Lead mais velho"
              value={report.oldestLeadCreatedAt !== null ? formatDate(report.oldestLeadCreatedAt) : "—"}
              icon={History}
              hint="Data de criação"
            />
            <KpiCard
              label="Ciclo de vida médio"
              value={report.avgLifecycleDays !== null ? formatDays(report.avgLifecycleDays) : "—"}
              icon={Timer}
              hint="Da criação até o fechamento, de quem fechou no período"
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
            <FunnelWaterfallChart stages={report.stages} lost={lost} />
          </div>
        </>
      ) : (
        <p className="text-sm text-[var(--muted)]">Nenhum funil encontrado.</p>
      )}
    </div>
  );
}
