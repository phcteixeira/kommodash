import { loadKommoDataset } from "@/lib/kommo/dataset";
import { buildStatusTypeMap, buildRevenueByPeriod, buildRevenueSummary, type RevenueGranularity } from "@/lib/kommo/aggregate";
import { resolveRange } from "@/lib/date-range";
import { formatCurrency, formatNumber } from "@/lib/format";
import { PageHeader } from "@/components/layout/PageHeader";
import { DateRangeFilter } from "@/components/filters/DateRangeFilter";
import { EmptyState } from "@/components/ui/EmptyState";
import { KpiCard } from "@/components/ui/KpiCard";
import { AreaTrendChart } from "@/components/charts/AreaTrendChart";
import { Wallet, TrendingUp, TrendingDown } from "lucide-react";

export default async function FaturamentoPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const { range } = await searchParams;
  const { key: rangeKey, from } = resolveRange(range);
  const { dataset, isDemo, error } = await loadKommoDataset({ createdFrom: from });
  const { leads, pipelines, account } = dataset;

  const statusTypeMap = buildStatusTypeMap(pipelines);
  const granularity: RevenueGranularity = rangeKey === "7d" || rangeKey === "30d" ? "day" : "month";
  const points = buildRevenueByPeriod(leads, statusTypeMap, granularity);
  const summary = buildRevenueSummary(points);

  const chartData = points.map((p) => ({ period: p.periodLabel, revenue: Math.round(p.wonRevenue) }));

  return (
    <div>
      <PageHeader
        title="Faturamento e negócios fechados"
        description="Valor ganho ao longo do tempo, com base na data de fechamento do negócio."
        filters={<DateRangeFilter current={rangeKey} />}
      />

      {isDemo ? <div className="mb-6"><EmptyState variant={error ? "error" : "not-configured"} message={error} /></div> : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Faturamento total" value={formatCurrency(summary.totalWonRevenue, account?.currency)} icon={Wallet} accent="good" />
        <KpiCard label="Negócios ganhos" value={formatNumber(summary.totalWonCount)} icon={TrendingUp} />
        <KpiCard label="Negócios perdidos" value={formatNumber(summary.totalLostCount)} icon={TrendingDown} />
        <KpiCard label="Ticket médio" value={formatCurrency(summary.avgTicket, account?.currency)} />
      </div>

      <div className="mt-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <h2 className="mb-4 font-medium text-[var(--text-primary)]">Evolução do faturamento</h2>
        {chartData.length > 0 ? (
          <AreaTrendChart
            data={chartData}
            categoryKey="period"
            valueKey="revenue"
            name="Faturamento"
            valueFormat="currency"
            currency={account?.currency}
          />
        ) : (
          <p className="text-sm text-[var(--muted)]">Nenhum negócio fechado no período selecionado.</p>
        )}
      </div>
    </div>
  );
}
