import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { loadKommoDataset, loadLossReasons } from "@/lib/kommo/dataset";
import { buildLossReasonDetail, buildStatusTypeMap, resolveLossReasonName } from "@/lib/kommo/aggregate";
import { resolveClosingsWindow } from "@/lib/date-range";
import { formatDate, formatNumber } from "@/lib/format";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Table } from "@/components/ui/Table";

export default async function PerdaMotivoDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ reasonId: string }>;
  searchParams: Promise<{ period?: string; from?: string; to?: string }>;
}) {
  const { reasonId: reasonIdParam } = await params;
  const { period, from: fromParam, to: toParam } = await searchParams;
  const reasonId = Number(reasonIdParam);
  const window = resolveClosingsWindow({ period, from: fromParam, to: toParam });

  const [{ dataset, isDemo: datasetIsDemo, error: datasetError }, lossReasonsResult] = await Promise.all([
    loadKommoDataset({ closedFrom: window.from, closedTo: window.to }),
    loadLossReasons(),
  ]);
  const { leads, users, pipelines } = dataset;

  const isDemo = datasetIsDemo || lossReasonsResult.isDemo;
  const error = datasetError ?? lossReasonsResult.error;

  const statusTypeMap = buildStatusTypeMap(pipelines);
  const reasonName = resolveLossReasonName(reasonId, lossReasonsResult.lossReasons);
  const rows = buildLossReasonDetail(leads, users, statusTypeMap, reasonId, window);

  const backQuery = new URLSearchParams();
  backQuery.set("period", window.key);
  if (window.key === "custom") {
    if (fromParam) backQuery.set("from", fromParam);
    if (toParam) backQuery.set("to", toParam);
  }

  return (
    <div>
      <Link
        href={`/dashboard/perdas?${backQuery.toString()}`}
        className="mb-4 inline-flex items-center gap-1 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Voltar para Perdas
      </Link>

      <PageHeader
        title={reasonName}
        description={`${formatNumber(rows.length)} lead(s) perdido(s) por este motivo no período selecionado.`}
      />

      {isDemo ? <div className="mb-6"><EmptyState variant={error ? "error" : "not-configured"} message={error} /></div> : null}

      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <Table
          keyFor={(r) => r.leadId}
          rows={rows}
          columns={[
            { header: "Nome do Lead", cell: (r) => r.leadName },
            { header: "Data da Perda", cell: (r) => formatDate(r.closedAt) },
            { header: "Usuário responsável", cell: (r) => r.userName, align: "right" },
          ]}
        />
      </div>
    </div>
  );
}
