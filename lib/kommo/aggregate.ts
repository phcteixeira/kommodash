import type {
  KommoCatalogElement,
  KommoCustomField,
  KommoLead,
  KommoLossReason,
  KommoPipeline,
  KommoPipelineStatus,
  KommoProductLinkEvent,
  KommoStatusChangeEvent,
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

// ---------- Visão geral (resumo executivo) ----------

export interface OverviewSummary {
  totalLeads: number;
  /** Leads com status "ganho" — indica que houve conversão, não o que foi vendido (ver `contractCount`). */
  wonCount: number;
  /** % de leads do período com status "ganho". */
  wonRate: number;
  /**
   * Nº de produtos (serviços) contratados pelos leads do período — soma de
   * `catalog_element_ids`, não nº de leads: um lead pode contratar mais de
   * um serviço. Métrica primária de resultado desta conta — ver CLAUDE.md.
   */
  contractCount: number;
  /** Contratos ÷ leads GANHOS do período — quantos serviços em média cada cliente fechado gera. */
  avgContractsPerLead: number;
}

export function buildOverviewSummary(
  leads: KommoLead[],
  statusTypeMap: Map<number, PipelineStatusType>
): OverviewSummary {
  let wonCount = 0;
  let contractCount = 0;
  for (const lead of leads) {
    if (statusTypeMap.get(lead.status_id) === "won") wonCount += 1;
    contractCount += lead.catalog_element_ids?.length ?? 0;
  }
  const totalLeads = leads.length;
  return {
    totalLeads,
    wonCount,
    wonRate: totalLeads > 0 ? wonCount / totalLeads : 0,
    contractCount,
    avgContractsPerLead: wonCount > 0 ? contractCount / wonCount : 0,
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

export const NO_REASON_KEY = -1;
export const NO_REASON_LABEL = "Sem motivo especificado";

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

export function resolveLossReasonName(reasonId: number, lossReasons: KommoLossReason[]): string {
  if (reasonId === NO_REASON_KEY) return NO_REASON_LABEL;
  return lossReasons.find((r) => r.id === reasonId)?.name ?? `Motivo ${reasonId}`;
}

export interface LossDetailRow {
  leadId: number;
  leadName: string;
  closedAt: number; // unix seconds
  userId: number;
  userName: string;
}

/**
 * Detalha, lead a lead, as perdas de um motivo específico dentro da janela
 * de tempo — mesma filtragem de `buildLossReasons`, mas sem agregar por
 * motivo. Usada na subpágina de detalhamento de Perdas.
 */
export function buildLossReasonDetail(
  leads: KommoLead[],
  users: KommoUser[],
  statusTypeMap: Map<number, PipelineStatusType>,
  reasonId: number,
  window: { from: Date; to: Date }
): LossDetailRow[] {
  const userNameById = new Map(users.map((u) => [u.id, u.name]));
  const fromSec = Math.floor(window.from.getTime() / 1000);
  const toSec = Math.floor(window.to.getTime() / 1000);

  const rows: LossDetailRow[] = [];
  for (const lead of leads) {
    if (statusTypeMap.get(lead.status_id) !== "lost") continue;
    if (!lead.closed_at || lead.closed_at < fromSec || lead.closed_at > toSec) continue;
    if ((lead.loss_reason_id ?? NO_REASON_KEY) !== reasonId) continue;

    rows.push({
      leadId: lead.id,
      leadName: lead.name,
      closedAt: lead.closed_at,
      userId: lead.responsible_user_id,
      userName: userNameById.get(lead.responsible_user_id) ?? `Usuário ${lead.responsible_user_id}`,
    });
  }

  return rows.sort((a, b) => b.closedAt - a.closedAt);
}

// ---------- Performance de leads (funil Serviço → Propostas Enviadas → Contratos) ----------

export const SERVICO_FIELD_NAME = "Serviço";
export const PROPOSTAS_ENVIADAS_FIELD_NAME = "Propostas Enviadas";

export type LeadFunnelStageKey = "created" | "demand" | "proposal" | "contract";

export interface LeadFunnelStage {
  key: LeadFunnelStageKey;
  label: string;
  /** "leads" na 1ª etapa; nas demais, a unidade é o item marcado/vinculado — não o lead. */
  unitLabel: string;
  count: number;
  /**
   * % sobre a 1ª etapa do seu grupo de unidade. "created" é sua própria base
   * (sempre 1). As 3 etapas de itens (demand/proposal/contract) são relativas
   * a "demand" — não a "created" — porque leads e itens marcados/vinculados
   * têm unidades diferentes (1 lead pode gerar vários itens), então comparar
   * itens contra a contagem de leads produzia percentuais sem sentido.
   */
  shareOfTotal: number;
  /** % sobre a contagem da etapa anterior. null na 1ª etapa. */
  conversionFromPrevious: number | null;
}

export interface LeadFunnelReport {
  stages: LeadFunnelStage[];
  totalLeadsCreated: number;
  /** Contratos efetivados ÷ leads criados — taxa de conversão geral do funil (unidades diferentes, mas é o headline que fecha o funil). */
  overallConversionRate: number;
}

function findLeadFieldId(customFields: KommoCustomField[], name: string): number | null {
  const normalized = name.trim().toLowerCase();
  return (
    customFields.find((f) => f.entity_type === "leads" && f.name.trim().toLowerCase() === normalized)?.id ?? null
  );
}

/** Quantas opções estão marcadas (checked) em um campo de múltipla escolha, para um lead. */
function countCheckedValues(lead: KommoLead, fieldId: number | null): number {
  if (fieldId === null) return 0;
  const field = lead.custom_fields_values?.find((v) => v.field_id === fieldId);
  return field?.values.length ?? 0;
}

/**
 * Levantamento de funil: Total de Leads Criados > Identificação de Demanda
 * (marcações no campo "Serviço") > Propostas Enviadas (marcações no campo
 * "Propostas Enviadas") > Contratos Efetivados (produtos vinculados). A partir
 * da 2ª etapa, a contagem é de itens marcados/vinculados — não de leads
 * distintos: um lead que marca 3 serviços contribui com 3 na etapa de demanda.
 * Janela de tempo baseada em `created_at` do lead (coorte de criação).
 */
export function buildLeadPerformanceFunnel(
  leads: KommoLead[],
  customFields: KommoCustomField[],
  window: { from: Date; to: Date }
): LeadFunnelReport {
  const fromSec = Math.floor(window.from.getTime() / 1000);
  const toSec = Math.floor(window.to.getTime() / 1000);
  const leadsInWindow = leads.filter((l) => l.created_at >= fromSec && l.created_at <= toSec);

  const servicoFieldId = findLeadFieldId(customFields, SERVICO_FIELD_NAME);
  const propostasFieldId = findLeadFieldId(customFields, PROPOSTAS_ENVIADAS_FIELD_NAME);

  const totalLeadsCreated = leadsInWindow.length;
  const demandCount = leadsInWindow.reduce((sum, l) => sum + countCheckedValues(l, servicoFieldId), 0);
  const proposalCount = leadsInWindow.reduce((sum, l) => sum + countCheckedValues(l, propostasFieldId), 0);
  const contractCount = leadsInWindow.reduce((sum, l) => sum + (l.catalog_element_ids?.length ?? 0), 0);

  const raw: { key: LeadFunnelStageKey; label: string; unitLabel: string; count: number }[] = [
    { key: "created", label: "Total de Leads Criados", unitLabel: "leads", count: totalLeadsCreated },
    { key: "demand", label: "Demandas Identificadas", unitLabel: "serviços marcados", count: demandCount },
    { key: "proposal", label: "Propostas Enviadas", unitLabel: "propostas marcadas", count: proposalCount },
    { key: "contract", label: "Contratos Efetivados", unitLabel: "produtos vinculados", count: contractCount },
  ];

  const stages: LeadFunnelStage[] = raw.map((stage, i) => ({
    ...stage,
    // "created" é sua própria base; as demais são relativas a "demand" (índice 1) — ver LeadFunnelStage.shareOfTotal.
    shareOfTotal: i === 0 ? 1 : demandCount > 0 ? stage.count / demandCount : 0,
    conversionFromPrevious: i === 0 ? null : raw[i - 1].count > 0 ? stage.count / raw[i - 1].count : 0,
  }));

  return {
    stages,
    totalLeadsCreated,
    overallConversionRate: totalLeadsCreated > 0 ? contractCount / totalLeadsCreated : 0,
  };
}

// ---------- Leads e funil (taxa de avanço e permanência por etapa) ----------

export type FunnelStatusFilter = "all" | "active" | "closed";

export interface FunnelStageRow {
  statusId: number;
  name: string;
  type: PipelineStatusType;
  /** Quantos leads (do conjunto filtrado) já alcançaram essa etapa em algum momento — não só os que estão parados nela agora. */
  reachedCount: number;
  /** % sobre a 1ª etapa (sempre 100% por definição). */
  shareOfFirstStage: number;
  /** % sobre a contagem da etapa anterior. null na 1ª etapa. */
  conversionFromPrevious: number | null;
  /** Dias médios que os leads passam NA ETAPA ANTERIOR antes de sair dela. null na 1ª etapa ou sem permanências completas registradas. */
  avgDaysInPreviousStage: number | null;
}

export interface FunnelBottleneck {
  biggestDrop: { stageName: string; dropRate: number } | null;
  longestDwell: { stageName: string; avgDays: number } | null;
}

export interface FunnelConversionReport {
  pipelineId: number;
  pipelineName: string;
  /** Etapas regulares + "ganho", em ordem de sort — "perdido" fica fora (ver `lost`, motivo no comentário de `buildFunnelConversion`). */
  stages: FunnelStageRow[];
  totalLeadsInScope: number;
  lost: { count: number; shareOfFirstStage: number };
  /** Ciclo de vida médio (criação -> fechamento) dos leads fechados (ganhos ou perdidos) do conjunto filtrado, em dias. null sem nenhum fechado. */
  avgLifecycleDays: number | null;
  bottleneck: FunnelBottleneck;
}

/**
 * Taxa de avanço e tempo de permanência por etapa do funil, a partir do
 * histórico real de mudanças de status (`lead_status_changed`) — não apenas
 * do retrato atual (quantos leads estão parados em cada etapa agora).
 *
 * - "Alcançou a etapa": o lead teve, em algum momento, um evento levando-o
 *   para aquela etapa (ou é a 1ª etapa, onde todo lead do conjunto entra por
 *   definição). Um lead que avançou e voltou continua contando uma vez.
 * - "Permanência": para cada trecho contínuo em uma etapa (chegada -> saída),
 *   a duração conta para a média daquela etapa. Só permanências COMPLETAS
 *   entram na média (o lead já saiu de lá) — a etapa atual de um lead ainda
 *   aberto fica de fora, pra não subestimar a média com dado incompleto.
 * - "Perdido" fica separado da sequência principal (não é uma etapa
 *   sequencial: um lead pode ser perdido a partir de qualquer etapa regular).
 * - Eventos de outro pipeline (o lead migrou e voltou) são ignorados — uma
 *   simplificação: casos assim ficam com a permanência da etapa anterior
 *   à migração superestimada, mas são raros nesta conta.
 */
export function buildFunnelConversion(
  leads: KommoLead[],
  events: KommoStatusChangeEvent[],
  pipeline: KommoPipeline,
  statusFilter: FunnelStatusFilter,
  createdFrom?: Date,
  createdTo?: Date
): FunnelConversionReport {
  const fromSec = createdFrom ? Math.floor(createdFrom.getTime() / 1000) : null;
  const toSec = createdTo ? Math.floor(createdTo.getTime() / 1000) : null;
  const localTypeById = new Map(pipeline.statuses.map((s) => [s.id, s.type]));

  // Cohorte do pipeline+período, antes do filtro de aba (Todos os/Ativos/Fechados) — usada para
  // o ciclo de vida médio, que não deve zerar na aba "Ativos" (leads ativos nunca têm closed_at).
  const cohortLeads = leads.filter((l) => {
    if (l.pipeline_id !== pipeline.id) return false;
    if (fromSec !== null && l.created_at < fromSec) return false;
    if (toSec !== null && l.created_at > toSec) return false;
    return true;
  });

  const leadsInScope = cohortLeads.filter((l) => {
    const type = localTypeById.get(l.status_id) ?? "regular";
    if (statusFilter === "active") return type === "regular";
    if (statusFilter === "closed") return type === "won" || type === "lost";
    return true;
  });
  const leadIdsInScope = new Set(leadsInScope.map((l) => l.id));
  const totalLeadsInScope = leadsInScope.length;

  const sequence = [...pipeline.statuses]
    .filter((s) => s.type !== "lost")
    .sort((a, b) => a.sort - b.sort);
  const firstStageId = sequence[0]?.id;

  // Alcance acumulado: quem chegou a cada etapa (a 1ª etapa é todo mundo, por definição).
  const reachedByStage = new Map<number, Set<number>>();
  if (firstStageId !== undefined) reachedByStage.set(firstStageId, new Set(leadIdsInScope));

  // Eventos relevantes: só do pipeline selecionado e de leads no conjunto filtrado, agrupados por lead.
  const eventsByLead = new Map<number, KommoStatusChangeEvent[]>();
  for (const event of events) {
    if (event.pipelineId !== pipeline.id) continue;
    if (!leadIdsInScope.has(event.leadId)) continue;
    const list = eventsByLead.get(event.leadId) ?? [];
    list.push(event);
    eventsByLead.set(event.leadId, list);
  }
  for (const list of eventsByLead.values()) list.sort((a, b) => a.changedAt - b.changedAt);

  // Durações completas (chegada -> próxima mudança) por etapa, para a média de permanência.
  const durationsByStage = new Map<number, number[]>();

  for (const lead of leadsInScope) {
    const leadEvents = eventsByLead.get(lead.id) ?? [];
    // Linha do tempo do lead: entra na 1ª etapa na criação, depois cada mudança de status registrada.
    const timeline: { stageId: number; at: number }[] =
      firstStageId !== undefined ? [{ stageId: firstStageId, at: lead.created_at }] : [];
    for (const event of leadEvents) {
      timeline.push({ stageId: event.toStatusId, at: event.changedAt });
      const reached = reachedByStage.get(event.toStatusId) ?? new Set<number>();
      reached.add(lead.id);
      reachedByStage.set(event.toStatusId, reached);
    }

    for (let i = 0; i < timeline.length - 1; i++) {
      const days = (timeline[i + 1].at - timeline[i].at) / 86400;
      if (days < 0) continue; // relógio de evento fora de ordem — ignora em vez de distorcer a média
      const list = durationsByStage.get(timeline[i].stageId) ?? [];
      list.push(days);
      durationsByStage.set(timeline[i].stageId, list);
    }
    // O último trecho da timeline (etapa atual) fica de fora: permanência ainda em aberto.
  }

  function avgDays(stageId: number): number | null {
    const list = durationsByStage.get(stageId);
    if (!list || list.length === 0) return null;
    return list.reduce((s, d) => s + d, 0) / list.length;
  }

  const firstReachedCount = firstStageId !== undefined ? reachedByStage.get(firstStageId)?.size ?? 0 : 0;

  const stages: FunnelStageRow[] = sequence.map((status, i) => {
    const reachedCount = reachedByStage.get(status.id)?.size ?? 0;
    const prevReachedCount = i === 0 ? null : reachedByStage.get(sequence[i - 1].id)?.size ?? 0;
    return {
      statusId: status.id,
      name: status.name,
      type: status.type,
      reachedCount,
      shareOfFirstStage: firstReachedCount > 0 ? reachedCount / firstReachedCount : 0,
      conversionFromPrevious:
        i === 0 ? null : prevReachedCount && prevReachedCount > 0 ? reachedCount / prevReachedCount : 0,
      avgDaysInPreviousStage: i === 0 ? null : avgDays(sequence[i - 1].id),
    };
  });

  const lostCount = leadsInScope.filter((l) => localTypeById.get(l.status_id) === "lost").length;

  // Da cohorte inteira (não de `leadsInScope`) — na aba "Ativos" não haveria nenhum lead fechado
  // para calcular a média, mas o ciclo de vida típico do funil continua sendo uma informação útil ali.
  const closedLeads = cohortLeads.filter((l) => l.closed_at !== null);
  const avgLifecycleDays =
    closedLeads.length > 0
      ? closedLeads.reduce((sum, l) => sum + (l.closed_at! - l.created_at) / 86400, 0) / closedLeads.length
      : null;

  let biggestDrop: FunnelBottleneck["biggestDrop"] = null;
  let longestDwell: FunnelBottleneck["longestDwell"] = null;
  for (let i = 1; i < stages.length; i++) {
    const conv = stages[i].conversionFromPrevious;
    if (conv !== null && (biggestDrop === null || 1 - conv > biggestDrop.dropRate)) {
      biggestDrop = { stageName: stages[i].name, dropRate: 1 - conv };
    }
    const dwell = avgDays(sequence[i - 1].id);
    if (dwell !== null && (longestDwell === null || dwell > longestDwell.avgDays)) {
      longestDwell = { stageName: sequence[i - 1].name, avgDays: dwell };
    }
  }

  return {
    pipelineId: pipeline.id,
    pipelineName: pipeline.name,
    stages,
    totalLeadsInScope,
    lost: { count: lostCount, shareOfFirstStage: firstReachedCount > 0 ? lostCount / firstReachedCount : 0 },
    avgLifecycleDays,
    bottleneck: { biggestDrop, longestDwell },
  };
}

// ---------- Marketing digital (origem/campanha/criativo dos leads) ----------

// Campos nativos `tracking_data` da Kommo, preenchidos automaticamente pelas
// integrações de anúncio (não digitados) — identificados pelo `code`, que é
// estável, ao contrário do nome (que pode ser renomeado na conta).
const UTM_SOURCE_CODE = "UTM_SOURCE";
const UTM_CAMPAIGN_CODE = "UTM_CAMPAIGN";
const UTM_CONTENT_CODE = "UTM_CONTENT";

function findLeadFieldByCode(customFields: KommoCustomField[], code: string): number | null {
  return customFields.find((f) => f.entity_type === "leads" && f.code === code)?.id ?? null;
}

function fieldTextValue(lead: KommoLead, fieldId: number | null): string | null {
  if (fieldId === null) return null;
  const field = lead.custom_fields_values?.find((v) => v.field_id === fieldId);
  const raw = field?.values[0]?.value;
  return raw !== undefined && raw !== null && raw !== "" ? String(raw) : null;
}

export interface MarketingSourceRow {
  key: string;
  name: string;
  /** Presente só nas linhas de campanha paga (valor de `utm_campaign`) — usado para linkar o detalhamento por criativo. */
  campaignParam: string | null;
  totalLeads: number;
  /** Leads com status "ganho" — quantos clientes, sem dizer o que compraram. Ver `contractCount` para o que foi vendido. */
  wonCount: number;
  /** % de leads do grupo com status "ganho". */
  wonRate: number;
  /**
   * Nº de produtos (serviços) contratados pelos leads desse grupo — soma de
   * `catalog_element_ids`, não nº de leads: um lead pode contratar mais de
   * um serviço. Métrica primária de resultado desta conta — ver CLAUDE.md:
   * "ganho" só indica que houve conversão, não diz o que foi vendido.
   */
  contractCount: number;
  /** % de leads do grupo com ao menos 1 produto contratado. */
  contractRate: number;
  lostCount: number;
  /** Ciclo de vida médio (criação -> fechamento) dos leads fechados desse grupo, em dias. null sem nenhum fechado. */
  avgLifecycleDays: number | null;
}

export interface MarketingReport {
  totalLeads: number;
  /** Leads com `utm_source` preenchido — tráfego pago com origem identificada pela integração de anúncio. */
  trackedLeads: number;
  trackedShare: number;
  /** Campanhas pagas (agrupadas por `utm_campaign`), ordenadas por volume. */
  campaigns: MarketingSourceRow[];
  /** Soma de `contractCount` de todas as campanhas — contratos atribuíveis a tráfego pago no período. */
  totalContracts: number;
  topCampaign: MarketingSourceRow | null;
  /** Maior taxa de conversão em contrato entre campanhas com volume mínimo (evita destacar uma campanha de 1-2 leads por acaso). */
  bestConversionCampaign: MarketingSourceRow | null;
}

const MIN_SAMPLE_FOR_BEST_CONVERSION = 5;

function buildSourceRow(
  key: string,
  name: string,
  campaignParam: string | null,
  groupLeads: KommoLead[],
  statusTypeMap: Map<number, PipelineStatusType>
): MarketingSourceRow {
  let wonCount = 0;
  let lostCount = 0;
  let leadsWithContract = 0;
  let contractCount = 0;
  const closedDurationsDays: number[] = [];
  for (const lead of groupLeads) {
    const type = statusTypeMap.get(lead.status_id) ?? "regular";
    if (type === "won") wonCount += 1;
    else if (type === "lost") lostCount += 1;
    const productCount = lead.catalog_element_ids?.length ?? 0;
    if (productCount > 0) leadsWithContract += 1;
    contractCount += productCount;
    if (lead.closed_at !== null) closedDurationsDays.push((lead.closed_at - lead.created_at) / 86400);
  }
  const totalLeads = groupLeads.length;
  return {
    key,
    name,
    campaignParam,
    totalLeads,
    wonCount,
    wonRate: totalLeads > 0 ? wonCount / totalLeads : 0,
    contractCount,
    contractRate: totalLeads > 0 ? leadsWithContract / totalLeads : 0,
    lostCount,
    avgLifecycleDays:
      closedDurationsDays.length > 0
        ? closedDurationsDays.reduce((sum, d) => sum + d, 0) / closedDurationsDays.length
        : null,
  };
}

/**
 * Volume e conversão de leads por campanha/criativo, a partir dos campos de
 * rastreamento nativos da Kommo (UTM). Cobre só tráfego pago identificado por
 * `utm_campaign` — leads sem essa origem não entram no relatório: o único
 * outro sinal de origem disponível ("Origem Lead") é preenchido manualmente e
 * sem confiabilidade garantida, então não é usado aqui. Conversão é medida em
 * contratos (produtos vinculados), não em "ganho" — ver CLAUDE.md. Não inclui
 * custo/ROI: a conta não tem valor (`price`) nem investimento de anúncio
 * registrados na Kommo.
 */
export function buildMarketingReport(
  leads: KommoLead[],
  customFields: KommoCustomField[],
  statusTypeMap: Map<number, PipelineStatusType>
): MarketingReport {
  const sourceFieldId = findLeadFieldByCode(customFields, UTM_SOURCE_CODE);
  const campaignFieldId = findLeadFieldByCode(customFields, UTM_CAMPAIGN_CODE);

  const totalLeads = leads.length;
  const trackedLeads = leads.filter((l) => fieldTextValue(l, sourceFieldId) !== null).length;

  const byCampaign = new Map<string, KommoLead[]>();
  for (const lead of leads) {
    const campaign = fieldTextValue(lead, campaignFieldId);
    if (!campaign) continue;
    const list = byCampaign.get(campaign) ?? [];
    list.push(lead);
    byCampaign.set(campaign, list);
  }

  const campaigns = Array.from(byCampaign.entries())
    .map(([name, groupLeads]) => buildSourceRow(name, name, name, groupLeads, statusTypeMap))
    .sort((a, b) => b.totalLeads - a.totalLeads);

  const totalContracts = campaigns.reduce((sum, c) => sum + c.contractCount, 0);
  const topCampaign = campaigns[0] ?? null;
  const eligible = campaigns.filter((c) => c.totalLeads >= MIN_SAMPLE_FOR_BEST_CONVERSION);
  const bestConversionCampaign =
    eligible.length > 0 ? eligible.reduce((best, c) => (c.contractRate > best.contractRate ? c : best)) : null;

  return {
    totalLeads,
    trackedLeads,
    trackedShare: totalLeads > 0 ? trackedLeads / totalLeads : 0,
    campaigns,
    totalContracts,
    topCampaign,
    bestConversionCampaign,
  };
}

/** Criativos (`utm_content`) de uma campanha específica, para a subpágina de detalhamento. */
export function buildCampaignCreatives(
  leads: KommoLead[],
  customFields: KommoCustomField[],
  statusTypeMap: Map<number, PipelineStatusType>,
  campaignName: string
): MarketingSourceRow[] {
  const campaignFieldId = findLeadFieldByCode(customFields, UTM_CAMPAIGN_CODE);
  const contentFieldId = findLeadFieldByCode(customFields, UTM_CONTENT_CODE);

  const leadsInCampaign = leads.filter((l) => fieldTextValue(l, campaignFieldId) === campaignName);

  const byContent = new Map<string, KommoLead[]>();
  for (const lead of leadsInCampaign) {
    const content = fieldTextValue(lead, contentFieldId) ?? "Sem criativo identificado";
    const list = byContent.get(content) ?? [];
    list.push(lead);
    byContent.set(content, list);
  }

  return Array.from(byContent.entries())
    .map(([name, groupLeads]) => buildSourceRow(name, name, null, groupLeads, statusTypeMap))
    .sort((a, b) => b.totalLeads - a.totalLeads);
}

export interface CampaignProductRow {
  key: string;
  creativeName: string;
  productName: string;
  contractCount: number;
}

/**
 * Produtos (serviços) contratados por leads de uma campanha, quebrado por
 * criativo — "esse anúncio específico traz cliente pra qual serviço".
 * Ordenado do produto mais contratado para o menos, dentro de cada criativo.
 */
export function buildCampaignProductBreakdown(
  leads: KommoLead[],
  customFields: KommoCustomField[],
  catalogElements: KommoCatalogElement[],
  campaignName: string
): CampaignProductRow[] {
  const campaignFieldId = findLeadFieldByCode(customFields, UTM_CAMPAIGN_CODE);
  const contentFieldId = findLeadFieldByCode(customFields, UTM_CONTENT_CODE);
  const productNameById = new Map(catalogElements.map((e) => [e.id, e.name]));

  const leadsInCampaign = leads.filter((l) => fieldTextValue(l, campaignFieldId) === campaignName);

  const rowByKey = new Map<string, CampaignProductRow>();
  for (const lead of leadsInCampaign) {
    const creativeName = fieldTextValue(lead, contentFieldId) ?? "Sem criativo identificado";
    for (const productId of lead.catalog_element_ids ?? []) {
      const productName = productNameById.get(productId) ?? `Produto ${productId}`;
      const key = `${creativeName}::${productId}`;
      const row = rowByKey.get(key) ?? { key, creativeName, productName, contractCount: 0 };
      row.contractCount += 1;
      rowByKey.set(key, row);
    }
  }

  return Array.from(rowByKey.values()).sort(
    (a, b) => a.creativeName.localeCompare(b.creativeName) || b.contractCount - a.contractCount
  );
}
