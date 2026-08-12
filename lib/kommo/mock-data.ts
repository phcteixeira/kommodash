import type {
  KommoAccount,
  KommoCatalog,
  KommoCatalogElement,
  KommoCustomField,
  KommoDataset,
  KommoLead,
  KommoPipeline,
  KommoProductLinkEvent,
  KommoTask,
  KommoUser,
} from "./types";

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

function buildLeads(): KommoLead[] {
  const leads: KommoLead[] = [];
  const statuses = MOCK_PIPELINES[0].statuses;
  for (let i = 0; i < 90; i++) {
    const created = daysAgo(Math.floor(rand() * 180));
    const status = pick(statuses);
    const isClosed = status.type !== "regular";
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
      custom_fields_values: [],
      catalog_element_ids: pickCatalogElementIds(),
    });
  }
  return leads;
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
