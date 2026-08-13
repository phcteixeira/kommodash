import { Filter, ListChecks, FileSignature, Trophy, Target, Percent } from "lucide-react";
import { loadKommoDataset } from "@/lib/kommo/dataset";
import { buildStatusTypeMap, buildFunnel, buildOverviewSummary, buildActivitySummary } from "@/lib/kommo/aggregate";
import { resolveFunnelRange, toDateInputValue } from "@/lib/date-range";
import { formatDecimal, formatNumber, formatPercent } from "@/lib/format";
import { PageHeader } from "@/components/layout/PageHeader";
import { OverviewFilterBar } from "@/components/filters/OverviewFilterBar";
import { KpiCard } from "@/components/ui/KpiCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { DonutChart } from "@/components/charts/DonutChart";
import { STATUS, CATEGORICAL } from "@/lib/palette";

export default async function DashboardOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string }>;
}) {
  const { range, from: fromParam, to: toParam } = await searchParams;
  const { key: rangeKey, from, to } = resolveFunnelRange({ range, from: fromParam, to: toParam });
  const { dataset, isDemo, error } = await loadKommoDataset({ createdFrom: from, createdTo: to });
  const { leads, pipelines, users, tasks, account } = dataset;

  const statusTypeMap = buildStatusTypeMap(pipelines);
  const mainPipeline = pipelines[0];
  const funnel = mainPipeline ? buildFunnel(leads, mainPipeline) : null;
  const overview = buildOverviewSummary(leads, statusTypeMap);
  const activities = buildActivitySummary(tasks, users);
  const totalOverdue = activities.reduce((sum, a) => sum + a.overdue, 0);

  return (
    <div>
      <PageHeader
        title={`Visão geral${account ? ` — ${account.name}` : ""}`}
        description="Resumo dos principais indicadores da sua conta Kommo."
      />

      {isDemo ? <div className="mb-6"><EmptyState variant={error ? "error" : "not-configured"} message={error} /></div> : null}

      <OverviewFilterBar
        currentRange={rangeKey}
        currentFrom={from ? toDateInputValue(from) : ""}
        currentTo={to ? toDateInputValue(to) : ""}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <KpiCard label="Leads no período" value={formatNumber(overview.totalLeads)} icon={Filter} />
        <KpiCard label="Leads Ganhos" value={formatNumber(overview.wonCount)} icon={Trophy} accent="good" />
        <KpiCard
          label="Contratos Convertidos"
          value={formatNumber(overview.contractCount)}
          icon={FileSignature}
          accent="good"
        />
        <KpiCard
          label="Contrato por Lead (Média)"
          value={formatDecimal(overview.avgContractsPerLead)}
          icon={Target}
          hint="Contratos ÷ leads ganhos"
        />
        <KpiCard label="Taxa de Conversão de Lead" value={formatPercent(overview.wonRate)} icon={Percent} />
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
