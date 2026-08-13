import type {
  KommoAccount,
  KommoCatalog,
  KommoCatalogElement,
  KommoCustomField,
  KommoCustomFieldValue,
  KommoDataset,
  KommoLead,
  KommoLossReason,
  KommoPipeline,
  KommoProductLinkEvent,
  KommoStatusChangeEvent,
  KommoTask,
  KommoUser,
} from "./types";
import { ORIGEM_LEAD_FIELD_NAME, PROPOSTAS_ENVIADAS_FIELD_NAME, SERVICO_FIELD_NAME } from "./aggregate";

// PRNG determinístico (mulberry32) para que os dados de demonstração
// sejam estáveis entre requisições, em vez de mudar a cada refresh.
function mulberry32(seed: number) {
  let a = seed;
  return function rand() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(42);
const pick = <T,>(arr: T[]): T => arr[Math.floor(rand() * arr.length)];
const daysAgo = (n: number) => Math.floor(Date.now() / 1000) - n * 86400;

const MOCK_USERS: KommoUser[] = [
  { id: 1001, name: "Ana Souza", email: "ana@demo.com", is_active: true },
  { id: 1002, name: "Bruno Lima", email: "bruno@demo.com", is_active: true },
  { id: 1003, name: "Carla Melo", email: "carla@demo.com", is_active: true },
  { id: 1004, name: "Diego Alves", email: "diego@demo.com", is_active: true },
];

const MOCK_PIPELINES: KommoPipeline[] = [
  {
    id: 1,
    name: "Funil de Vendas",
    sort: 1,
    is_main: true,
    statuses: [
      { id: 100, name: "Novo lead", sort: 10, color: "#99ccff", pipeline_id: 1, type: "regular" },
      { id: 101, name: "Qualificação", sort: 20, color: "#ffcc66", pipeline_id: 1, type: "regular" },
      { id: 102, name: "Proposta enviada", sort: 30, color: "#ff9966", pipeline_id: 1, type: "regular" },
      { id: 103, name: "Negociação", sort: 40, color: "#cc99ff", pipeline_id: 1, type: "regular" },
      { id: 142, name: "Venda ganha", sort: 50, color: "#66cc66", pipeline_id: 1, type: "won" },
      { id: 143, name: "Venda perdida", sort: 60, color: "#cc6666", pipeline_id: 1, type: "lost" },
    ],
  },
];

const products = ["Plano Starter", "Plano Pro", "Plano Enterprise", "Consultoria", "Add-on Suporte"];
const PRODUCT_IDS = products.map((_, i) => 7000 + i);

const lossReasonNames = ["Sem orçamento", "Fechou com concorrente", "Sem retorno do lead", "Fora do prazo"];
const LOSS_REASON_IDS = lossReasonNames.map((_, i) => 8000 + i);

function pickLossReasonId(): number | null {
  const roll = rand();
  if (roll < 0.15) return null; // sem motivo especificado
  return pick(LOSS_REASON_IDS);
}

function pickCatalogElementIds(): number[] {
  const roll = rand();
  if (roll < 0.08) return []; // lead sem produto vinculado
  if (roll < 0.94) return [pick(PRODUCT_IDS)]; // um produto (caso mais comum)
  // dois produtos distintos
  const first = pick(PRODUCT_IDS);
  let second = pick(PRODUCT_IDS);
  while (second === first) second = pick(PRODUCT_IDS);
  return [first, second];
}

// IDs dos campos "Serviço" e "Propostas Enviadas" no dataset mockado — mesmos
// nomes/opções de `products`, espelhando a configuração real da conta Kommo
// (ver `buildLeadPerformanceFunnel`, que localiza os campos pelo nome).
const SERVICO_FIELD_ID = 20;
const PROPOSTAS_FIELD_ID = 21;
const SERVICO_ENUM_IDS = products.map((_, i) => 9100 + i);
const PROPOSTAS_ENUM_IDS = products.map((_, i) => 9200 + i);

/** Índices (em `products`) marcados como demanda identificada — nem todo lead tem um. */
function pickServiceIndexes(): number[] {
  const roll = rand();
  if (roll < 0.12) return []; // SDR ainda não identificou demanda
  if (roll < 0.55) return [Math.floor(rand() * products.length)]; // 1 serviço (mais comum)
  // 2 serviços distintos
  const first = Math.floor(rand() * products.length);
  let second = Math.floor(rand() * products.length);
  while (second === first) second = Math.floor(rand() * products.length);
  return [first, second];
}

/** De cada serviço identificado, só uma parte é de fato formalizada em proposta. */
function pickProposalIndexes(serviceIndexes: number[]): number[] {
  return serviceIndexes.filter(() => rand() < 0.65);
}

function buildLeadCustomFieldsValues(serviceIndexes: number[], proposalIndexes: number[]): KommoCustomFieldValue[] {
  const values: KommoCustomFieldValue[] = [];
  if (serviceIndexes.length > 0) {
    values.push({
      field_id: SERVICO_FIELD_ID,
      field_name: SERVICO_FIELD_NAME,
      field_code: null,
      field_type: "multiselect",
      values: serviceIndexes.map((i) => ({ value: products[i], enum_id: SERVICO_ENUM_IDS[i] })),
    });
  }
  if (proposalIndexes.length > 0) {
    values.push({
      field_id: PROPOSTAS_FIELD_ID,
      field_name: PROPOSTAS_ENVIADAS_FIELD_NAME,
      field_code: null,
      field_type: "multiselect",
      values: proposalIndexes.map((i) => ({ value: products[i], enum_id: PROPOSTAS_ENUM_IDS[i] })),
    });
  }
  return values;
}

// IDs/nomes espelhando os campos nativos `tracking_data` (UTM) + o campo
// manual "Origem Lead" observados na conta real (ver `buildMarketingReport`).
const UTM_SOURCE_FIELD_ID = 30;
const UTM_MEDIUM_FIELD_ID = 31;
const UTM_CAMPAIGN_FIELD_ID = 32;
const UTM_CONTENT_FIELD_ID = 33;
const ORIGEM_LEAD_FIELD_ID = 34;
const ORIGEM_LEAD_ENUM_IDS = { Indicação: 9300, "Já Cliente": 9301, Orgânico: 9302 } as const;

const MOCK_CAMPAIGNS = ["Campanha Verão | Engajamento", "Institucional | Conversão", "Leads Frios | Lookalike"];
const MOCK_CREATIVES = [
  "Anúncio A - Depoimento",
  "Anúncio B - Oferta especial",
  "Anúncio C - Vídeo explicativo",
  "Anúncio D - Antes e depois",
];
const MOCK_ORIGENS = Object.keys(ORIGEM_LEAD_ENUM_IDS) as (keyof typeof ORIGEM_LEAD_ENUM_IDS)[];

/**
 * Mistura de canais espelhando a conta real: ~55% tráfego pago rastreado
 * (campanha + criativo), ~30% origem classificada manualmente (indicação,
 * já cliente, orgânico), ~15% sem nenhuma origem registrada.
 */
function buildMarketingFieldValues(): KommoCustomFieldValue[] {
  const roll = rand();
  if (roll < 0.55) {
    return [
      {
        field_id: UTM_SOURCE_FIELD_ID,
        field_name: "utm_source",
        field_code: "UTM_SOURCE",
        field_type: "tracking_data",
        values: [{ value: "facebook" }],
      },
      {
        field_id: UTM_MEDIUM_FIELD_ID,
        field_name: "utm_medium",
        field_code: "UTM_MEDIUM",
        field_type: "tracking_data",
        values: [{ value: "paid_social" }],
      },
      {
        field_id: UTM_CAMPAIGN_FIELD_ID,
        field_name: "utm_campaign",
        field_code: "UTM_CAMPAIGN",
        field_type: "tracking_data",
        values: [{ value: pick(MOCK_CAMPAIGNS) }],
      },
      {
        field_id: UTM_CONTENT_FIELD_ID,
        field_name: "utm_content",
        field_code: "UTM_CONTENT",
        field_type: "tracking_data",
        values: [{ value: pick(MOCK_CREATIVES) }],
      },
    ];
  }
  if (roll < 0.85) {
    const origem = pick(MOCK_ORIGENS);
    return [
      {
        field_id: ORIGEM_LEAD_FIELD_ID,
        field_name: ORIGEM_LEAD_FIELD_NAME,
        field_code: null,
        field_type: "select",
        values: [{ value: origem, enum_id: ORIGEM_LEAD_ENUM_IDS[origem] }],
      },
    ];
  }
  return []; // sem nenhuma origem registrada
}

function buildLeads(): KommoLead[] {
  const leads: KommoLead[] = [];
  const statuses = MOCK_PIPELINES[0].statuses;
  for (let i = 0; i < 90; i++) {
    const created = daysAgo(Math.floor(rand() * 180));
    const status = pick(statuses);
    const isClosed = status.type !== "regular";
    const isLost = status.type === "lost";
    const serviceIndexes = pickServiceIndexes();
    const proposalIndexes = pickProposalIndexes(serviceIndexes);
    leads.push({
      id: 5000 + i,
      name: `${pick(products)} - ${pick(["Empresa", "Loja", "Studio", "Grupo"])} ${i + 1}`,
      price: Math.round(300 + rand() * 9700),
      responsible_user_id: pick(MOCK_USERS).id,
      pipeline_id: 1,
      status_id: status.id,
      created_at: created,
      updated_at: created + Math.floor(rand() * 10) * 86400,
      closed_at: isClosed ? created + Math.floor(rand() * 20) * 86400 : null,
      closest_task_at: null,
      custom_fields_values: [...buildLeadCustomFieldsValues(serviceIndexes, proposalIndexes), ...buildMarketingFieldValues()],
      catalog_element_ids: pickCatalogElementIds(),
      loss_reason_id: isLost ? pickLossReasonId() : null,
    });
  }
  return leads;
}

const REGULAR_STATUSES = [...MOCK_PIPELINES[0].statuses]
  .filter((s) => s.type === "regular")
  .sort((a, b) => a.sort - b.sort);

/**
 * Caminho de etapas assumido para um lead, do ponto após a 1ª etapa (entrada
 * é implícita, via `created_at`) até a etapa/desfecho final já sorteado em
 * `buildLeads`. Leads fechados são assumidos como tendo passado por todas as
 * etapas regulares antes do desfecho — suficiente para o funil de demonstração.
 */
function statusPathFor(lead: KommoLead): number[] {
  const finalStatus = MOCK_PIPELINES[0].statuses.find((s) => s.id === lead.status_id);
  if (!finalStatus) return [];
  if (finalStatus.type === "regular") {
    const idx = REGULAR_STATUSES.findIndex((s) => s.id === finalStatus.id);
    return REGULAR_STATUSES.slice(1, idx + 1).map((s) => s.id); // exclui a 1ª etapa (implícita)
  }
  return [...REGULAR_STATUSES.slice(1).map((s) => s.id), finalStatus.id]; // ganho/perdido: passou por todas antes
}

/** Simula eventos `lead_status_changed`, espaçados uniformemente entre a criação e o desfecho/última atualização do lead. */
function buildStatusChangeEvents(leads: KommoLead[]): KommoStatusChangeEvent[] {
  const now = Math.floor(Date.now() / 1000);
  const events: KommoStatusChangeEvent[] = [];
  for (const lead of leads) {
    const path = statusPathFor(lead);
    if (path.length === 0) continue;
    const endTime = lead.closed_at ?? lead.updated_at ?? now;
    const span = Math.max(endTime - lead.created_at, path.length);
    for (let j = 0; j < path.length; j++) {
      const at = lead.created_at + Math.round((span * (j + 1)) / (path.length + 1));
      events.push({
        leadId: lead.id,
        pipelineId: MOCK_PIPELINES[0].id,
        fromStatusId: j === 0 ? REGULAR_STATUSES[0].id : path[j - 1],
        toStatusId: path[j],
        changedAt: Math.min(at, endTime),
      });
    }
  }
  return events;
}

function buildTasks(): KommoTask[] {
  const tasks: KommoTask[] = [];
  const types: KommoTask["task_type_id"][] = [1, 2, 3];
  for (let i = 0; i < 70; i++) {
    const createdOffset = Math.floor(rand() * 60);
    const dueOffset = createdOffset - Math.floor(rand() * 40 - 10); // pode ser passado ou futuro
    const isCompleted = rand() > 0.4;
    tasks.push({
      id: 9000 + i,
      text: pick(["Ligar para o lead", "Enviar proposta", "Reunião de fechamento", "Follow-up"]),
      responsible_user_id: pick(MOCK_USERS).id,
      entity_type: "leads",
      entity_id: 5000 + (i % 90),
      is_completed: isCompleted,
      task_type_id: pick(types),
      complete_till: daysAgo(dueOffset),
      created_at: daysAgo(createdOffset),
      updated_at: daysAgo(createdOffset),
      result: isCompleted ? { text: "Concluído" } : null,
    });
  }
  return tasks;
}

/**
 * Simula eventos de vínculo lead↔produto ("fechamentos"). ~25% dos vínculos
 * ficam sem evento de propósito, para exercitar o fallback pela data de
 * criação do lead (mesmo caminho usado quando a Kommo não tem o evento).
 */
function buildProductLinkEvents(leads: KommoLead[]): KommoProductLinkEvent[] {
  const now = Math.floor(Date.now() / 1000);
  const events: KommoProductLinkEvent[] = [];
  for (const lead of leads) {
    for (const productId of lead.catalog_element_ids) {
      if (rand() < 0.25) continue; // sem evento de propósito
      const daysSinceCreated = Math.max(0, Math.floor((now - lead.created_at) / 86400));
      const offsetDays = Math.floor(rand() * Math.min(4, daysSinceCreated + 1));
      events.push({
        leadId: lead.id,
        catalogElementId: productId,
        linkedAt: lead.created_at + offsetDays * 86400,
      });
    }
  }
  return events;
}

const MOCK_CUSTOM_FIELDS: KommoCustomField[] = [
  { id: 1, name: "Origem do lead", code: "SOURCE", type: "select", entity_type: "leads", enums: [
    { id: 1, value: "Site", sort: 1 },
    { id: 2, value: "Indicação", sort: 2 },
    { id: 3, value: "Redes sociais", sort: 3 },
  ] },
  { id: 2, name: "Segmento", code: null, type: "text", entity_type: "leads" },
  {
    id: SERVICO_FIELD_ID,
    name: SERVICO_FIELD_NAME,
    code: null,
    type: "multiselect",
    entity_type: "leads",
    enums: products.map((name, i) => ({ id: SERVICO_ENUM_IDS[i], value: name, sort: i })),
  },
  {
    id: PROPOSTAS_FIELD_ID,
    name: PROPOSTAS_ENVIADAS_FIELD_NAME,
    code: null,
    type: "multiselect",
    entity_type: "leads",
    enums: products.map((name, i) => ({ id: PROPOSTAS_ENUM_IDS[i], value: name, sort: i })),
  },
  { id: UTM_SOURCE_FIELD_ID, name: "utm_source", code: "UTM_SOURCE", type: "tracking_data", entity_type: "leads" },
  { id: UTM_MEDIUM_FIELD_ID, name: "utm_medium", code: "UTM_MEDIUM", type: "tracking_data", entity_type: "leads" },
  { id: UTM_CAMPAIGN_FIELD_ID, name: "utm_campaign", code: "UTM_CAMPAIGN", type: "tracking_data", entity_type: "leads" },
  { id: UTM_CONTENT_FIELD_ID, name: "utm_content", code: "UTM_CONTENT", type: "tracking_data", entity_type: "leads" },
  {
    id: ORIGEM_LEAD_FIELD_ID,
    name: ORIGEM_LEAD_FIELD_NAME,
    code: null,
    type: "select",
    entity_type: "leads",
    enums: MOCK_ORIGENS.map((value, i) => ({ id: ORIGEM_LEAD_ENUM_IDS[value], value, sort: i })),
  },
  { id: 3, name: "Telefone", code: "PHONE", type: "multitext", entity_type: "contacts" },
  { id: 4, name: "E-mail", code: "EMAIL", type: "multitext", entity_type: "contacts" },
  { id: 5, name: "CNPJ", code: null, type: "text", entity_type: "companies" },
  { id: 6, name: "Porte da empresa", code: null, type: "select", entity_type: "companies", enums: [
    { id: 1, value: "Pequeno", sort: 1 },
    { id: 2, value: "Médio", sort: 2 },
    { id: 3, value: "Grande", sort: 3 },
  ] },
];

const MOCK_CATALOGS: KommoCatalog[] = [
  { id: 1, name: "Produtos e Serviços", can_add_elements: true, type: "regular" },
];

const MOCK_CATALOG_ELEMENTS: KommoCatalogElement[] = products.map((name, i) => ({
  id: PRODUCT_IDS[i],
  name,
  catalog_id: 1,
  custom_fields_values: [],
}));

const MOCK_LOSS_REASONS: KommoLossReason[] = lossReasonNames.map((name, i) => ({
  id: LOSS_REASON_IDS[i],
  name,
  sort: i,
}));

const MOCK_ACCOUNT: KommoAccount = {
  id: 1,
  name: "Conta Demonstração",
  subdomain: "demo",
  currency: "BRL",
};

// Gerados uma única vez, na ordem abaixo, e reutilizados em toda chamada —
// o PRNG é compartilhado e mutável, então recriar essas listas a cada
// chamada faria os dados "andarem" a cada navegação e, pior, faria os
// eventos de vínculo (que dependem dos mesmos leads) ficarem inconsistentes
// entre `getMockDataset()` e `getMockProductLinkEvents()`.
const MOCK_LEADS = buildLeads();
const MOCK_TASKS = buildTasks();
const MOCK_PRODUCT_LINK_EVENTS = buildProductLinkEvents(MOCK_LEADS);
const MOCK_STATUS_CHANGE_EVENTS = buildStatusChangeEvents(MOCK_LEADS);

export function getMockDataset(): KommoDataset {
  return {
    account: MOCK_ACCOUNT,
    leads: MOCK_LEADS,
    pipelines: MOCK_PIPELINES,
    users: MOCK_USERS,
    tasks: MOCK_TASKS,
    customFields: MOCK_CUSTOM_FIELDS,
    catalogs: MOCK_CATALOGS,
    catalogElements: MOCK_CATALOG_ELEMENTS,
  };
}

export function getMockProductLinkEvents(): KommoProductLinkEvent[] {
  return MOCK_PRODUCT_LINK_EVENTS;
}

export function getMockStatusChangeEvents(): KommoStatusChangeEvent[] {
  return MOCK_STATUS_CHANGE_EVENTS;
}

export function getMockLossReasons(): KommoLossReason[] {
  return MOCK_LOSS_REASONS;
}
