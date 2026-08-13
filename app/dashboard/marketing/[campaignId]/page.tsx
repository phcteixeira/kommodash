import { loadKommoDataset } from "@/lib/kommo/dataset";
import { buildCampaignCreatives, buildStatusTypeMap } from "@/lib/kommo/aggregate";
import { resolveFunnelRange, toDateInputValue } from "@/lib/date-range";
import { formatDays, formatNumber, formatPercent } from "@/lib/format";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { LinkButton } from "@/components/ui/LinkButton";
import { Table } from "@/components/ui/Table";
import { ArrowLeft } from "lucide-react";

export default async function MarketingCampaignDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ campaignId: string }>;
  searchParams: Promise<{ range?: string; from?: string; to?: string }>;
}) {
  const { campaignId } = await params;
  const { range, from: fromParam, to: toParam } = await searchParams;
  const { key: rangeKey, from, to } = resolveFunnelRange({ range, from: fromParam, to: toParam });
  // Ao contrário do que se poderia supor, o Next NÃO decodifica automaticamente
  // o segmento dinâmico — `campaignId` chega como veio da URL (ex.:
  // "Campanha%20Ver%C3%A3o..."), então precisa decodificar aqui.
  const campaignName = decodeURIComponent(campaignId);

  const { dataset, isDemo, error } = await loadKommoDataset({ createdFrom: from, createdTo: to });
  const { leads, pipelines, customFields } = dataset;

  const statusTypeMap = buildStatusTypeMap(pipelines);
  const creatives = buildCampaignCreatives(leads, customFields, statusTypeMap, campaignName);
  const totalLeads = creatives.reduce((sum, c) => sum + c.totalLeads, 0);

  const backQuery = new URLSearchParams();
  backQuery.set("range", rangeKey);
  if (rangeKey === "custom") {
    if (from) backQuery.set("from", toDateInputValue(from));
    if (to) backQuery.set("to", toDateInputValue(to));
  }

  return (
    <div>
      <LinkButton
        href={`/dashboard/marketing?${backQuery.toString()}`}
        label="Voltar para Marketing digital"
        icon={<ArrowLeft className="h-3.5 w-3.5" />}
        iconPosition="before"
        className="mb-4 inline-flex items-center gap-1 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
      />

      <PageHeader
        title={campaignName}
        description={`${formatNumber(totalLeads)} lead(s) rastreado(s) nesta campanha, por criativo.`}
      />

      {isDemo ? <div className="mb-6"><EmptyState variant={error ? "error" : "not-configured"} message={error} /></div> : null}

      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <Table
          keyFor={(r) => r.key}
          rows={creatives}
          columns={[
            { header: "Criativo", cell: (r) => r.name },
            { header: "Leads", cell: (r) => formatNumber(r.totalLeads), align: "right" },
            { header: "Ganhos", cell: (r) => formatNumber(r.wonCount), align: "right" },
            { header: "Perdidos", cell: (r) => formatNumber(r.lostCount), align: "right" },
            { header: "Taxa de ganho", cell: (r) => formatPercent(r.wonRate), align: "right" },
            {
              header: "Ciclo médio",
              cell: (r) => (r.avgLifecycleDays !== null ? formatDays(r.avgLifecycleDays) : "—"),
              align: "right",
            },
          ]}
        />
      </div>
    </div>
  );
}
