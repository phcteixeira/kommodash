import { loadKommoDataset } from "@/lib/kommo/dataset";
import { buildStatusTypeMap, buildSellerPerformance } from "@/lib/kommo/aggregate";
import { resolveRange } from "@/lib/date-range";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/format";
import { PageHeader } from "@/components/layout/PageHeader";
import { DateRangeFilter } from "@/components/filters/DateRangeFilter";
import { EmptyState } from "@/components/ui/EmptyState";
import { BarComparisonChart } from "@/components/charts/BarComparisonChart";
import { Table } from "@/components/ui/Table";
import { CATEGORICAL } from "@/lib/palette";

export default async function VendedoresPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const { range } = await searchParams;
  const { key: rangeKey, from } = resolveRange(range);
  const { dataset, isDemo, error } = await loadKommoDataset({ createdFrom: from });
  const { leads, users, pipelines, account } = dataset;

  const statusTypeMap = buildStatusTypeMap(pipelines);
  const sellers = buildSellerPerformance(leads, users, statusTypeMap);

  const chartData = sellers.slice(0, 10).map((s) => ({
    seller: s.userName,
    revenue: Math.round(s.wonRevenue),
  }));

  return (
    <div>
      <PageHeader
        title="Desempenho de vendedores"
        description="Leads, negócios ganhos/perdidos e faturamento por responsável."
        filters={<DateRangeFilter current={rangeKey} />}
      />

      {isDemo ? <div className="mb-6"><EmptyState variant={error ? "error" : "not-configured"} message={error} /></div> : null}

      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <h2 className="mb-4 font-medium text-[var(--text-primary)]">Ranking por faturamento (ganhos)</h2>
        <BarComparisonChart
          data={chartData}
          categoryKey="seller"
          series={[{ key: "revenue", name: "Faturamento", color: CATEGORICAL[0] }]}
          layout="vertical"
          height={Math.max(220, chartData.length * 40)}
          valueFormat="currency"
          currency={account?.currency}
        />
      </div>

      <div className="mt-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <h2 className="mb-4 font-medium text-[var(--text-primary)]">Detalhamento</h2>
        <Table
          keyFor={(s) => s.userId}
          rows={sellers}
          columns={[
            { header: "Vendedor", cell: (s) => s.userName },
            { header: "Leads", cell: (s) => formatNumber(s.totalLeads), align: "right" },
            { header: "Ganhos", cell: (s) => formatNumber(s.wonCount), align: "right" },
            { header: "Perdidos", cell: (s) => formatNumber(s.lostCount), align: "right" },
            { header: "Taxa de vitória", cell: (s) => formatPercent(s.winRate), align: "right" },
            { header: "Ticket médio", cell: (s) => formatCurrency(s.avgTicket, account?.currency), align: "right" },
            { header: "Faturamento", cell: (s) => formatCurrency(s.wonRevenue, account?.currency), align: "right" },
          ]}
        />
      </div>
    </div>
  );
}
