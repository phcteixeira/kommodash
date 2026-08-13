import { loadKommoDataset } from "@/lib/kommo/dataset";
import { buildMarketingReport, buildStatusTypeMap } from "@/lib/kommo/aggregate";
import { resolveFunnelRange, toDateInputValue } from "@/lib/date-range";
import { formatDays, formatNumber, formatPercent, truncateText } from "@/lib/format";
import { PageHeader } from "@/components/layout/PageHeader";
import { MarketingFilterBar } from "@/components/filters/MarketingFilterBar";
import { EmptyState } from "@/components/ui/EmptyState";
import { KpiCard } from "@/components/ui/KpiCard";
import { Table } from "@/components/ui/Table";
import { LinkButton } from "@/components/ui/LinkButton";
import { ChevronRight, Megaphone, Percent, Target, TrendingUp } from "lucide-react";

export default async function MarketingPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string }>;
}) {
  const { range, from: fromParam, to: toParam } = await searchParams;
  const { key: rangeKey, from, to } = resolveFunnelRange({ range, from: fromParam, to: toParam });
  const { dataset, isDemo, error } = await loadKommoDataset({ createdFrom: from, createdTo: to });
  const { leads, pipelines, customFields } = dataset;

  const statusTypeMap = buildStatusTypeMap(pipelines);
  const report = buildMarketingReport(leads, customFields, statusTypeMap);

  const detailQuery = new URLSearchParams();
  detailQuery.set("range", rangeKey);
  if (rangeKey === "custom") {
    if (from) detailQuery.set("from", toDateInputValue(from));
    if (to) detailQuery.set("to", toDateInputValue(to));
  }

  return (
    <div>
      <PageHeader
        title="Marketing digital"
        description="Volume e conversão de leads por campanha e criativo, a partir dos parâmetros de rastreamento (UTM) da Kommo."
      />

      {isDemo ? <div className="mb-6"><EmptyState variant={error ? "error" : "not-configured"} message={error} /></div> : null}

      <MarketingFilterBar
        currentRange={rangeKey}
        currentFrom={from ? toDateInputValue(from) : ""}
        currentTo={to ? toDateInputValue(to) : ""}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Leads no período" value={formatNumber(report.totalLeads)} icon={Target} />
        <KpiCard
          label="Com origem rastreada"
          value={formatPercent(report.trackedShare)}
          icon={Percent}
          hint={`${formatNumber(report.trackedLeads)} leads via UTM`}
        />
        <KpiCard
          label="Campanha com mais leads"
          value={report.topCampaign ? truncateText(report.topCampaign.name) : "—"}
          icon={Megaphone}
          hint={report.topCampaign ? `${formatNumber(report.topCampaign.totalLeads)} leads` : undefined}
        />
        <KpiCard
          label="Melhor conversão"
          value={report.bestConversionCampaign ? truncateText(report.bestConversionCampaign.name) : "—"}
          icon={TrendingUp}
          accent="good"
          hint={report.bestConversionCampaign ? `${formatPercent(report.bestConversionCampaign.wonRate)} de taxa de ganho` : undefined}
        />
      </div>

      <div className="mt-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <h2 className="mb-1 font-medium text-[var(--text-primary)]">Desempenho por Campanha</h2>
        <p className="mb-4 text-sm text-[var(--text-secondary)]">
          Leads com campanha identificada via UTM (hoje, 100% tráfego pago do Facebook Ads nesta conta).
        </p>
        <Table
          keyFor={(r) => r.key}
          rows={report.campaigns}
          columns={[
            { header: "Campanha", cell: (r) => r.name },
            { header: "Leads", cell: (r) => formatNumber(r.totalLeads), align: "right" },
            { header: "Ganhos", cell: (r) => formatNumber(r.wonCount), align: "right" },
            { header: "Perdidos", cell: (r) => formatNumber(r.lostCount), align: "right" },
            { header: "Taxa de ganho", cell: (r) => formatPercent(r.wonRate), align: "right" },
            {
              header: "Ciclo médio",
              cell: (r) => (r.avgLifecycleDays !== null ? formatDays(r.avgLifecycleDays) : "—"),
              align: "right",
            },
            {
              header: "",
              cell: (r) => (
                <LinkButton
                  href={`/dashboard/marketing/${encodeURIComponent(r.campaignParam ?? r.key)}?${detailQuery.toString()}`}
                  label="Detalhamento"
                  icon={<ChevronRight className="h-3.5 w-3.5" />}
                  className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--text-secondary)] transition-colors hover:bg-black/5"
                />
              ),
              align: "right",
            },
          ]}
        />
      </div>

      <div className="mt-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <h2 className="mb-1 font-medium text-[var(--text-primary)]">Outras origens</h2>
        <p className="mb-4 text-sm text-[var(--text-secondary)]">
          Leads sem campanha paga identificada — indicação, já cliente, orgânico, ou sem origem informada.
        </p>
        <Table
          keyFor={(r) => r.key}
          rows={report.otherSources}
          columns={[
            { header: "Origem", cell: (r) => r.name },
            { header: "Leads", cell: (r) => formatNumber(r.totalLeads), align: "right" },
            { header: "Ganhos", cell: (r) => formatNumber(r.wonCount), align: "right" },
            { header: "Perdidos", cell: (r) => formatNumber(r.lostCount), align: "right" },
            { header: "Taxa de ganho", cell: (r) => formatPercent(r.wonRate), align: "right" },
          ]}
        />
      </div>
    </div>
  );
}
