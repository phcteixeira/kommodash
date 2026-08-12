import { loadKommoDataset } from "@/lib/kommo/dataset";
import { buildProductRanking, bucketStart } from "@/lib/kommo/aggregate";
import { resolveGranularity } from "@/lib/date-range";
import { formatNumber } from "@/lib/format";
import { PageHeader } from "@/components/layout/PageHeader";
import { GranularityFilter } from "@/components/filters/GranularityFilter";
import { EmptyState } from "@/components/ui/EmptyState";
import { KpiCard } from "@/components/ui/KpiCard";
import { Table } from "@/components/ui/Table";
import { FileSignature, Package, TrendingUp, HelpCircle } from "lucide-react";

const PERIOD_LABEL: Record<string, string> = {
  day: "hoje",
  week: "esta semana",
  month: "este mês",
};

export default async function ContratosPage({
  searchParams,
}: {
  searchParams: Promise<{ granularity?: string }>;
}) {
  const { granularity: granularityParam } = await searchParams;
  const granularity = resolveGranularity(granularityParam);
  const from = bucketStart(new Date(), granularity);

  const { dataset, isDemo, error } = await loadKommoDataset({ createdFrom: from });
  const { leads, catalogElements } = dataset;

  const report = buildProductRanking(leads, catalogElements);
  const topProduct = report.ranking[0];

  return (
    <div>
      <PageHeader
        title="Contratos"
        description={`Quantidade de leads associados a cada produto, considerando os criados ${PERIOD_LABEL[granularity]}.`}
        filters={<GranularityFilter current={granularity} />}
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
        <h2 className="mb-4 font-medium text-[var(--text-primary)]">Leads por produto</h2>
        <Table
          keyFor={(r) => r.productId}
          rows={report.ranking}
          columns={[
            { header: "Produto", cell: (r) => r.productName },
            { header: "Quantidade de leads", cell: (r) => formatNumber(r.totalLeads), align: "right" },
          ]}
        />
      </div>
    </div>
  );
}
