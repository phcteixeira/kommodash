import { loadKommoDataset } from "@/lib/kommo/dataset";
import { buildProductLeadsReport } from "@/lib/kommo/aggregate";
import { resolveRange, resolveGranularity } from "@/lib/date-range";
import { formatNumber } from "@/lib/format";
import { PageHeader } from "@/components/layout/PageHeader";
import { DateRangeFilter } from "@/components/filters/DateRangeFilter";
import { GranularityFilter } from "@/components/filters/GranularityFilter";
import { EmptyState } from "@/components/ui/EmptyState";
import { KpiCard } from "@/components/ui/KpiCard";
import { BarComparisonChart } from "@/components/charts/BarComparisonChart";
import { Table } from "@/components/ui/Table";
import { CATEGORICAL, CHROME } from "@/lib/palette";
import { FileSignature, Package, TrendingUp, HelpCircle } from "lucide-react";

export default async function ContratosPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; granularity?: string }>;
}) {
  const { range, granularity: granularityParam } = await searchParams;
  const { key: rangeKey, from } = resolveRange(range);
  const granularity = resolveGranularity(granularityParam);
  const { dataset, isDemo, error } = await loadKommoDataset({ createdFrom: from });
  const { leads, catalogElements } = dataset;

  const report = buildProductLeadsReport(leads, catalogElements, granularity);

  const seriesColors = [...CATEGORICAL, CHROME.light.muted]; // último slot reservado para "Outros"
  const chartSeries = report.series.map((s, i) => ({
    key: s.key,
    name: s.name,
    color: s.key === "outros" ? CHROME.light.muted : seriesColors[i % CATEGORICAL.length],
  }));

  const topProduct = report.ranking[0];

  return (
    <div>
      <PageHeader
        title="Contratos"
        description="Quantidade de leads associados a cada produto, agrupados por período."
        filters={
          <>
            <GranularityFilter current={granularity} />
            <DateRangeFilter current={rangeKey} />
          </>
        }
      />

      {isDemo ? <div className="mb-6"><EmptyState variant={error ? "error" : "not-configured"} message={error} /></div> : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Leads com produto vinculado" value={formatNumber(report.totalLeadsWithProduct)} icon={FileSignature} />
        <KpiCard label="Produtos distintos" value={formatNumber(report.ranking.length)} icon={Package} />
        <KpiCard
          label="Produto mais associado"
          value={topProduct ? topProduct.productName : "—"}
          icon={TrendingUp}
          hint={topProduct ? `${formatNumber(topProduct.totalLeads)} leads` : undefined}
        />
        <KpiCard label="Leads sem produto" value={formatNumber(report.totalLeadsWithoutProduct)} icon={HelpCircle} />
      </div>

      <div className="mt-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <h2 className="mb-1 font-medium text-[var(--text-primary)]">Leads por produto ao longo do tempo</h2>
        <p className="mb-4 text-sm text-[var(--text-secondary)]">
          Cada barra é um {granularity === "day" ? "dia" : granularity === "week" ? "semana" : "mês"}; as cores mostram
          a contribuição de cada produto.
        </p>
        {report.points.length > 0 ? (
          <BarComparisonChart
            data={report.points}
            categoryKey="periodLabel"
            series={chartSeries}
            layout="horizontal"
            stacked
            height={360}
          />
        ) : (
          <p className="text-sm text-[var(--muted)]">Nenhum lead com produto vinculado no período selecionado.</p>
        )}
      </div>

      <div className="mt-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <h2 className="mb-4 font-medium text-[var(--text-primary)]">Ranking por produto</h2>
        <Table
          keyFor={(r) => r.productId}
          rows={report.ranking}
          columns={[
            { header: "Produto", cell: (r) => r.productName },
            { header: "Leads associados", cell: (r) => formatNumber(r.totalLeads), align: "right" },
          ]}
        />
      </div>
    </div>
  );
}
