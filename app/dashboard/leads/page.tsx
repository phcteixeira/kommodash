import { loadKommoDataset } from "@/lib/kommo/dataset";
import { buildFunnel } from "@/lib/kommo/aggregate";
import { resolveRange } from "@/lib/date-range";
import { formatNumber, formatPercent } from "@/lib/format";
import { PageHeader } from "@/components/layout/PageHeader";
import { DateRangeFilter } from "@/components/filters/DateRangeFilter";
import { PipelineFilter } from "@/components/filters/PipelineFilter";
import { KpiCard } from "@/components/ui/KpiCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { BarComparisonChart } from "@/components/charts/BarComparisonChart";
import { colorForStatusType } from "@/lib/palette";

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; pipeline?: string }>;
}) {
  const { range, pipeline } = await searchParams;
  const { key: rangeKey, from } = resolveRange(range);
  const { dataset, isDemo, error } = await loadKommoDataset({ createdFrom: from });
  const { leads, pipelines } = dataset;

  const selectedPipeline =
    pipelines.find((p) => p.id === Number(pipeline)) ?? pipelines[0];
  const funnel = selectedPipeline ? buildFunnel(leads, selectedPipeline) : null;

  const chartData =
    funnel?.stages.map((s) => ({
      stage: s.name,
      count: s.count,
      fill: colorForStatusType(s.type),
    })) ?? [];

  return (
    <div>
      <PageHeader
        title="Leads e funil de vendas"
        description="Distribuição dos leads pelas etapas do funil no período selecionado."
        filters={
          <>
            <PipelineFilter
              pipelines={pipelines.map((p) => ({ id: p.id, name: p.name }))}
              current={selectedPipeline?.id ?? 0}
            />
            <DateRangeFilter current={rangeKey} />
          </>
        }
      />

      {isDemo ? <div className="mb-6"><EmptyState variant={error ? "error" : "not-configured"} message={error} /></div> : null}

      {funnel ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <KpiCard label="Total de leads" value={formatNumber(funnel.totalLeads)} />
            <KpiCard label="Ganhos" value={formatNumber(funnel.wonCount)} accent="good" />
            <KpiCard label="Taxa de conversão" value={formatPercent(funnel.conversionRate)} />
          </div>

          <div className="mt-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
            <h2 className="mb-4 font-medium text-[var(--text-primary)]">Leads por etapa</h2>
            <BarComparisonChart
              data={chartData}
              categoryKey="stage"
              series={[{ key: "count", name: "Leads", color: colorForStatusType("regular") }]}
              colorKey="fill"
              layout="vertical"
              height={Math.max(220, chartData.length * 48)}
            />
          </div>
        </>
      ) : (
        <p className="text-sm text-[var(--muted)]">Nenhum funil encontrado.</p>
      )}
    </div>
  );
}
