import { format, startOfDay, startOfMonth, startOfWeek } from "date-fns";
import type {
  KommoCatalog,
  KommoCatalogElement,
  KommoCustomField,
  KommoLead,
  KommoLossReason,
  KommoPipeline,
  KommoPipelineStatus,
  KommoProductLinkEvent,
  KommoTask,
  KommoUser,
  PipelineStatusType,
} from "./types";

export function buildStatusTypeMap(pipelines: KommoPipeline[]): Map<number, PipelineStatusType> {
  const map = new Map<number, PipelineStatusType>();
  for (const pipeline of pipelines) {
    for (const status of pipeline.statuses) {
      map.set(status.id, status.type);
    }
  }
  return map;
}

// ---------- Funil de vendas ----------

export interface FunnelStage {
  statusId: number;
  name: string;
  color: string;
  count: number;
  type: PipelineStatusType;
}

export interface FunnelResult {
  pipelineId: number;
  pipelineName: string;
  stages: FunnelStage[];
  totalLeads: number;
  wonCount: number;
  lostCount: number;
  openCount: number;
  conversionRate: number; // wonCount / totalLeads
}

export function buildFunnel(leads: KommoLead[], pipeline: KommoPipeline): FunnelResult {
  const leadsInPipeline = leads.filter((l) => l.pipeline_id === pipeline.id);
  const stages: FunnelStage[] = [...pipeline.statuses]
    .sort((a, b) => a.sort - b.sort)
    .map((status: KommoPipelineStatus) => ({
      statusId: status.id,
      name: status.name,
      color: status.color,
      type: status.type,
      count: leadsInPipeline.filter((l) => l.status_id === status.id).length,
    }));

  const wonCount = stages.filter((s) => s.type === "won").reduce((sum, s) => sum + s.count, 0);
  const lostCount = stages.filter((s) => s.type === "lost").reduce((sum, s) => sum + s.count, 0);
  const totalLeads = leadsInPipeline.length;

  return {
    pipelineId: pipeline.id,
    pipelineName: pipeline.name,
    stages,
    totalLeads,
    wonCount,
    lostCount,
    openCount: totalLeads - wonCount - lostCount,
    conversionRate: totalLeads > 0 ? wonCount / totalLeads : 0,
  };
}

// ---------- Desempenho de vendedores ----------

export interface SellerPerformance {
  userId: number;
  userName: string;
  totalLeads: number;
  wonCount: number;
  lostCount: number;
  wonRevenue: number;
  avgTicket: number;
  winRate: number;
}

export function buildSellerPerformance(
  leads: KommoLead[],
  users: KommoUser[],
  statusTypeMap: Map<number, PipelineStatusType>
): SellerPerformance[] {
  const byUser = new Map<number, KommoLead[]>();
  for (const lead of leads) {
    const list = byUser.get(lead.responsible_user_id) ?? [];
    list.push(lead);
    byUser.set(lead.responsible_user_id, list);
  }

  const userNameById = new Map(users.map((u) => [u.id, u.name]));

  return Array.from(byUser.entries())
    .map(([userId, userLeads]) => {
      const won = userLeads.filter((l) => statusTypeMap.get(l.status_id) === "won");
      const lost = userLeads.filter((l) => statusTypeMap.get(l.status_id) === "lost");
      const wonRevenue = won.reduce((sum, l) => sum + (l.price || 0), 0);
      const closed = won.length + lost.length;

      return {
        userId,
        userName: userNameById.get(userId) ?? `Usuário ${userId}`,
        totalLeads: userLeads.length,
        wonCount: won.length,
        lostCount: lost.length,
        wonRevenue,
        avgTicket: won.length > 0 ? wonRevenue / won.length : 0,
        winRate: closed > 0 ? won.length / closed : 0,
      };
    })
    .sort((a, b) => b.wonRevenue - a.wonRevenue);
}

// ---------- Faturamento ----------

export type TimeGranularity = "day" | "week" | "month";
/** @deprecated use TimeGranularity — mantido para não quebrar imports existentes. */
export type RevenueGranularity = TimeGranularity;

export interface RevenuePoint {
  periodKey: string;
  periodLabel: string;
  wonRevenue: number;
  wonCount: number;
  lostCount: number;
}

export function bucketStart(date: Date, granularity: TimeGranularity): Date {
  if (granularity === "day") return startOfDay(date);
  if (granularity === "week") return startOfWeek(date, { weekStartsOn: 1 });
  return startOfMonth(date);
}

export function periodLabelFormat(granularity: TimeGranularity): string {
  return granularity === "month" ? "MMM/yyyy" : "dd/MM/yyyy";
}

export function buildRevenueByPeriod(
  leads: KommoLead[],
  statusTypeMap: Map<number, PipelineStatusType>,
  granularity: RevenueGranularity = "month"
): RevenuePoint[] {
  const buckets = new Map<string, RevenuePoint>();
  const labelFmt = periodLabelFormat(granularity);

  for (const lead of leads) {
    if (!lead.closed_at) continue;
    const type = statusTypeMap.get(lead.status_id);
    if (type !== "won" && type !== "lost") continue;

    const date = new Date(lead.closed_at * 1000);
    const bucketDate = bucketStart(date, granularity);
    const key = bucketDate.toISOString();

    const point = buckets.get(key) ?? {
      periodKey: key,
      periodLabel: format(bucketDate, labelFmt),
      wonRevenue: 0,
      wonCount: 0,
      lostCount: 0,
    };

    if (type === "won") {
      point.wonRevenue += lead.price || 0;
      point.wonCount += 1;
    } else {
      point.lostCount += 1;
    }

    buckets.set(key, point);
  }

  return Array.from(buckets.values()).sort((a, b) => a.periodKey.localeCompare(b.periodKey));
}

export interface RevenueSummary {
  totalWonRevenue: number;
  totalWonCount: number;
  totalLostCount: number;
  avgTicket: number;
}

export function buildRevenueSummary(points: RevenuePoint[]): RevenueSummary {
  const totalWonRevenue = points.reduce((s, p) => s + p.wonRevenue, 0);
  const totalWonCount = points.reduce((s, p) => s + p.wonCount, 0);
  const totalLostCount = points.reduce((s, p) => s + p.lostCount, 0);
  return {
    totalWonRevenue,
    totalWonCount,
    totalLostCount,
    avgTicket: totalWonCount > 0 ? totalWonRevenue / totalWonCount : 0,
  };
}

// ---------- Atividades e tarefas ----------

export interface ActivitySummary {
  userId: number;
  userName: string;
  completed: number;
  overdue: number;
  upcoming: number;
  total: number;
}

export function buildActivitySummary(tasks: KommoTask[], users: KommoUser[]): ActivitySummary[] {
  const now = Date.now() / 1000;
  const byUser = new Map<number, KommoTask[]>();
  for (const task of tasks) {
    const list = byUser.get(task.responsible_user_id) ?? [];
    list.push(task);
    byUser.set(task.responsible_user_id, list);
  }

  const userNameById = new Map(users.map((u) => [u.id, u.name]));

  return Array.from(byUser.entries())
    .map(([userId, userTasks]) => {
      const completed = userTasks.filter((t) => t.is_completed).length;
      const overdue = userTasks.filter((t) => !t.is_completed && t.complete_till < now).length;
      const upcoming = userTasks.filter((t) => !t.is_completed && t.complete_till >= now).length;
      return {
        userId,
        userName: userNameById.get(userId) ?? `Usuário ${userId}`,
        completed,
        overdue,
        upcoming,
        total: userTasks.length,
      };
    })
    .sort((a, b) => b.total - a.total);
}

// ---------- Produtos e campos personalizados ----------

export interface CatalogSummary {
  catalogId: number;
  catalogName: string;
  elementCount: number;
  elements: { id: number; name: string }[];
}

export function buildCatalogSummary(
  catalogs: KommoCatalog[],
  elements: KommoCatalogElement[]
): CatalogSummary[] {
  return catalogs.map((catalog) => {
    const catalogElements = elements.filter((e) => e.catalog_id === catalog.id);
    return {
      catalogId: catalog.id,
      catalogName: catalog.name,
      elementCount: catalogElements.length,
      elements: catalogElements.slice(0, 50).map((e) => ({ id: e.id, name: e.name })),
    };
  });
}

export interface CustomFieldsSummary {
  entityType: string;
  totalFields: number;
  byType: { type: string; count: number }[];
  fields: KommoCustomField[];
}

export function buildCustomFieldsSummary(fields: KommoCustomField[]): CustomFieldsSummary[] {
  const byEntity = new Map<string, KommoCustomField[]>();
  for (const field of fields) {
    const list = byEntity.get(field.entity_type) ?? [];
    list.push(field);
    byEntity.set(field.entity_type, list);
  }

  return Array.from(byEntity.entries()).map(([entityType, entityFields]) => {
    const typeCounts = new Map<string, number>();
    for (const f of entityFields) {
      typeCounts.set(f.type, (typeCounts.get(f.type) ?? 0) + 1);
    }
    return {
      entityType,
      totalFields: entityFields.length,
      byType: Array.from(typeCounts.entries()).map(([type, count]) => ({ type, count })),
      fields: entityFields,
    };
  });
}

// ---------- Contratos (fechamentos: lead x produto x data) ----------

export interface ClosingListRow {
  leadId: number;
  leadName: string;
  productId: number;
  productName: string;
  /** Data do vínculo (evento real) ou, na ausência de evento, a criação do lead. */
  closedAt: number; // unix seconds
  /** true quando não foi encontrado evento de vínculo e a data é uma aproximação. */
  isApproximate: boolean;
}

export interface ClosingsProductSummary {
  productId: number;
  productName: string;
  count: number;
}

export interface ClosingsReport {
  /** Um fechamento por linha (lead + produto + data), do mais recente para o mais antigo. */
  rows: ClosingListRow[];
  totalClosings: number;
  /** Quantos fechamentos usaram a data de criação do lead como aproximação (sem evento de vínculo encontrado). */
  approximateCount: number;
  /** Ranking por produto, derivado de `rows` — usado nos KPIs (produto mais vendido, produtos distintos). */
  productSummary: ClosingsProductSummary[];
}

/**
 * Lista "fechamentos" (produto vinculado a um lead) dentro de uma janela de
 * tempo. Fonte primária: eventos `entity_linked` (data exata do vínculo).
 * Para leads com produto vinculado mas sem evento correspondente encontrado
 * (dado antigo/importado, fora do alcance do log de eventos), usa a data de
 * criação do lead como aproximação — sinalizado em `isApproximate`.
 *
 * Um mesmo par (lead, produto) nunca aparece duas vezes: se há evento, a
 * aproximação por `created_at` é ignorada para aquele par.
 *
 * `leadNameById` deve cobrir tanto os leads de `leads` quanto qualquer lead
 * referenciado só pelos eventos (ex.: lead antigo, criado fora da janela,
 * que recebeu um produto novo agora) — ver `dataset.ts#resolveLeadNames`.
 */
export function buildClosings(
  leads: KommoLead[],
  catalogElements: KommoCatalogElement[],
  events: KommoProductLinkEvent[],
  window: { from: Date; to: Date },
  leadNameById: Map<number, string>
): ClosingsReport {
  const productNameById = new Map(catalogElements.map((e) => [e.id, e.name]));
  const validProductIds = new Set(catalogElements.map((e) => e.id));
  const fromSec = Math.floor(window.from.getTime() / 1000);
  const toSec = Math.floor(window.to.getTime() / 1000);

  const seen = new Set<string>(); // `${leadId}:${catalogElementId}`
  const rows: ClosingListRow[] = [];
  let approximateCount = 0;

  function addRow(leadId: number, productId: number, closedAt: number, isApproximate: boolean) {
    if (!validProductIds.has(productId)) return;
    const key = `${leadId}:${productId}`;
    if (seen.has(key)) return;
    seen.add(key);
    rows.push({
      leadId,
      leadName: leadNameById.get(leadId) ?? `Lead ${leadId}`,
      productId,
      productName: productNameById.get(productId) ?? `Produto ${productId}`,
      closedAt,
      isApproximate,
    });
    if (isApproximate) approximateCount += 1;
  }

  for (const event of events) {
    if (event.linkedAt < fromSec || event.linkedAt > toSec) continue;
    addRow(event.leadId, event.catalogElementId, event.linkedAt, false);
  }

  for (const lead of leads) {
    if (lead.created_at < fromSec || lead.created_at > toSec) continue;
    for (const productId of lead.catalog_element_ids ?? []) {
      addRow(lead.id, productId, lead.created_at, true); // ignorado se já veio de um evento real
    }
  }

  rows.sort((a, b) => b.closedAt - a.closedAt);

  const countByProduct = new Map<number, ClosingsProductSummary>();
  for (const row of rows) {
    const entry = countByProduct.get(row.productId) ?? {
      productId: row.productId,
      productName: row.productName,
      count: 0,
    };
    entry.count += 1;
    countByProduct.set(row.productId, entry);
  }
  const productSummary = Array.from(countByProduct.values()).sort((a, b) => b.count - a.count);

  return { rows, totalClosings: rows.length, approximateCount, productSummary };
}

// ---------- Perdas (leads perdidos por motivo) ----------

const NO_REASON_KEY = -1;
const NO_REASON_LABEL = "Sem motivo especificado";

export interface LossReasonRow {
  reasonId: number;
  reasonName: string;
  count: number;
}

export interface LossReasonsReport {
  rows: LossReasonRow[];
  totalLosses: number;
}

/**
 * Agrupa leads perdidos (status do tipo "lost") por motivo de perda, dentro
 * de uma janela de tempo baseada em `closed_at` — quando o lead foi marcado
 * como perdido. Leads sem `loss_reason_id` entram em "Sem motivo especificado".
 */
export function buildLossReasons(
  leads: KommoLead[],
  lossReasons: KommoLossReason[],
  statusTypeMap: Map<number, PipelineStatusType>,
  window: { from: Date; to: Date }
): LossReasonsReport {
  const reasonNameById = new Map(lossReasons.map((r) => [r.id, r.name]));
  const fromSec = Math.floor(window.from.getTime() / 1000);
  const toSec = Math.floor(window.to.getTime() / 1000);

  const countByReason = new Map<number, number>();

  for (const lead of leads) {
    if (statusTypeMap.get(lead.status_id) !== "lost") continue;
    if (!lead.closed_at || lead.closed_at < fromSec || lead.closed_at > toSec) continue;
    const reasonId = lead.loss_reason_id ?? NO_REASON_KEY;
    countByReason.set(reasonId, (countByReason.get(reasonId) ?? 0) + 1);
  }

  const rows = Array.from(countByReason.entries())
    .map(([reasonId, count]) => ({
      reasonId,
      reasonName: reasonId === NO_REASON_KEY ? NO_REASON_LABEL : reasonNameById.get(reasonId) ?? `Motivo ${reasonId}`,
      count,
    }))
    .sort((a, b) => b.count - a.count);

  const totalLosses = rows.reduce((sum, r) => sum + r.count, 0);

  return { rows, totalLosses };
}
