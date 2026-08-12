import { format, startOfDay, startOfMonth, startOfWeek } from "date-fns";
import type {
  KommoCatalog,
  KommoCatalogElement,
  KommoCustomField,
  KommoLead,
  KommoPipeline,
  KommoPipelineStatus,
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

// ---------- Contratos (leads por produto) ----------

export interface ProductRankingRow {
  productId: number;
  productName: string;
  totalLeads: number;
}

export interface ProductRankingReport {
  /** Um produto por linha, ordenado do mais para o menos associado a leads. */
  ranking: ProductRankingRow[];
  totalLeadsWithProduct: number;
  totalLeadsWithoutProduct: number;
}

/**
 * Agrupa leads pelos produtos (elementos de catálogo) vinculados a eles,
 * contando quantos leads cada produto tem. Um lead com N produtos conta
 * uma vez para cada um deles.
 */
export function buildProductRanking(
  leads: KommoLead[],
  catalogElements: KommoCatalogElement[]
): ProductRankingReport {
  const productNameById = new Map(catalogElements.map((e) => [e.id, e.name]));

  const totalByProduct = new Map<number, number>();
  let totalLeadsWithProduct = 0;
  let totalLeadsWithoutProduct = 0;

  for (const lead of leads) {
    const ids = lead.catalog_element_ids ?? [];
    if (ids.length === 0) {
      totalLeadsWithoutProduct += 1;
      continue;
    }
    totalLeadsWithProduct += 1;
    for (const id of ids) {
      totalByProduct.set(id, (totalByProduct.get(id) ?? 0) + 1);
    }
  }

  const ranking = Array.from(totalByProduct.entries())
    .map(([productId, totalLeads]) => ({
      productId,
      productName: productNameById.get(productId) ?? `Produto ${productId}`,
      totalLeads,
    }))
    .sort((a, b) => b.totalLeads - a.totalLeads);

  return { ranking, totalLeadsWithProduct, totalLeadsWithoutProduct };
}
