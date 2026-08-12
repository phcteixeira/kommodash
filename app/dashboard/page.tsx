import { Wallet, Filter, Users as UsersIcon, ListChecks } from "lucide-react";
import { loadKommoDataset } from "@/lib/kommo/dataset";
import { buildStatusTypeMap, buildFunnel, buildSellerPerformance, buildActivitySummary } from "@/lib/kommo/aggregate";
import { resolveRange } from "@/lib/date-range";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/format";
import { PageHeader } from "@/components/layout/PageHeader";
import { DateRangeFilter } from "@/components/filters/DateRangeFilter";
import { KpiCard } from "@/components/ui/KpiCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { DonutChart } from "@/components/charts/DonutChart";
import { STATUS, CATEGORICAL } from "@/lib/palette";

export default async function DashboardOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const { range } = await searchParams;
  const { key: rangeKey, from } = resolveRange(range);
  const { dataset, isDemo, error } = await loadKommoDataset({ createdFrom: from });
  const { leads, pipelines, users, tasks, account } = dataset;

  const statusTypeMap = buildStatusTypeMap(pipelines);
  const mainPipeline = pipelines[0];
  const funnel = mainPipeline ? buildFunnel(leads, mainPipeline) : null;
  const sellers = buildSellerPerformance(leads, users, statusTypeMap);
  const totalWonRevenue = sellers.reduce((sum, s) => sum + s.wonRevenue, 0);
  const activities = buildActivitySummary(tasks, users);
  const totalOverdue = activities.reduce((sum, a) => sum + a.overdue, 0);

  return (
    <div>
      <PageHeader
        title={`Visão geral${account ? ` — ${account.name}` : ""}`}
        description="Resumo dos principais indicadores da sua conta Kommo."
        filters={<DateRangeFilter current={rangeKey} />}
      />

      {isDemo ? <div className="mb-6"><EmptyState variant={error ? "error" : "not-configured"} message={error} /></div> : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Leads no período" value={formatNumber(leads.length)} icon={Filter} />
        <KpiCard
          label="Faturamento (ganhos)"
          value={formatCurrency(totalWonRevenue, account?.currency)}
          icon={Wallet}
          accent="good"
        />
        <KpiCard label="Vendedores ativos" value={formatNumber(sellers.length)} icon={UsersIcon} />
        <KpiCard
          label="Tarefas atrasadas"
          value={formatNumber(totalOverdue)}
          icon={ListChecks}
          accent={totalOverdue > 0 ? "critical" : "neutral"}
        />
      </div>

      {funnel ? (
        <div className="mt-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <h2 className="mb-1 font-medium text-[var(--text-primary)]">{funnel.pipelineName}</h2>
          <p className="mb-4 text-sm text-[var(--text-secondary)]">
            Taxa de conversão: {formatPercent(funnel.conversionRate)} · {formatNumber(funnel.totalLeads)} leads no
            funil
          </p>
          <DonutChart
            data={[
              { name: "Em aberto", value: funnel.openCount, color: CATEGORICAL[0] },
              { name: "Ganhos", value: funnel.wonCount, color: STATUS.good },
              { name: "Perdidos", value: funnel.lostCount, color: STATUS.critical },
            ]}
          />
        </div>
      ) : null}
    </div>
  );
}
