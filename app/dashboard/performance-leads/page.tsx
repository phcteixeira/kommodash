import { loadKommoDataset } from "@/lib/kommo/dataset";
import { buildLeadPerformanceFunnel } from "@/lib/kommo/aggregate";
import { resolveClosingsWindow, toDateInputValue } from "@/lib/date-range";
import { formatNumber, formatPercent } from "@/lib/format";
import { PageHeader } from "@/components/layout/PageHeader";
import { PerformanceLeadsFilterBar } from "@/components/filters/PerformanceLeadsFilterBar";
import { EmptyState } from "@/components/ui/EmptyState";
import { KpiCard } from "@/components/ui/KpiCard";
import { FunnelFlowChart } from "@/components/charts/FunnelFlowChart";
import { UserSearch, MessageSquareText, Send, FileCheck2, Target } from "lucide-react";

const STAGE_ICONS = [UserSearch, MessageSquareText, Send, FileCheck2] as const;

export default async function PerformanceLeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; from?: string; to?: string }>;
}) {
  const { period, from: fromParam, to: toParam } = await searchParams;
  const window = resolveClosingsWindow({ period, from: fromParam, to: toParam });

  const { dataset, isDemo, error } = await loadKommoDataset({ createdFrom: window.from, createdTo: window.to });
  const { leads, customFields } = dataset;

  const funnel = buildLeadPerformanceFunnel(leads, customFields, window);

  return (
    <div>
      <PageHeader
        title="Performance de leads"
        description="Do lead criado ao contrato efetivado: identificação de demanda, propostas enviadas e contratos, no período selecionado."
      />

      {isDemo ? <div className="mb-6"><EmptyState variant={error ? "error" : "not-configured"} message={error} /></div> : null}

      <div className="mb-6">
        <PerformanceLeadsFilterBar
          currentPeriod={window.key}
          currentFrom={toDateInputValue(window.from)}
          currentTo={toDateInputValue(window.to)}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {funnel.stages.map((stage, i) => (
          <KpiCard
            key={stage.key}
            label={stage.label}
            value={formatNumber(stage.count)}
            icon={STAGE_ICONS[i]}
            // "created" (i=0) não tem base para comparar; "demand" (i=1) É a
            // base das demais etapas — ver LeadFunnelStage.shareOfTotal.
            hint={i <= 1 ? undefined : `${formatPercent(stage.shareOfTotal)} da 1ª etapa`}
          />
        ))}
        <KpiCard
          label="Conversão geral"
          value={formatPercent(funnel.overallConversionRate)}
          icon={Target}
          hint="Contratos efetivados ÷ leads criados"
        />
      </div>

      <div className="mt-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <h2 className="mb-4 font-medium text-[var(--text-primary)]">Funil e fluxo</h2>
        <p className="mb-4 text-sm text-[var(--text-secondary)]">
          Demandas identificadas, propostas enviadas e contratos efetivados — mesma unidade (itens marcados/vinculados),
          por isso comparáveis diretamente. &quot;Total de Leads Criados&quot; fica só no card acima: é uma unidade
          diferente (1 lead pode gerar vários itens) e distorceria a comparação.
        </p>
        <FunnelFlowChart stages={funnel.stages.slice(1)} />
      </div>
    </div>
  );
}
