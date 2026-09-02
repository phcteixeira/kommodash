import { isKommoConfigured } from "./config";
import {
  getAccount,
  getCatalogElements,
  getCatalogs,
  getCustomFields,
  getLeadStatusChangeEvents,
  getLeads,
  getLeadsByIds,
  getLossReasons,
  getPipelines,
  getProductLinkEvents,
  getTasks,
  getUsers,
} from "./api";
import { getMockDataset, getMockLossReasons, getMockProductLinkEvents, getMockStatusChangeEvents } from "./mock-data";
import type { KommoDataset, KommoLead, KommoLossReason, KommoProductLinkEvent, KommoStatusChangeEvent } from "./types";
import { KommoApiError } from "./client";

export interface DatasetResult {
  dataset: KommoDataset;
  isDemo: boolean;
  error: string | null;
}

// Cache em memória (dura enquanto o processo/lambda ficar "quente") para evitar
// refazer a busca completa a cada navegação entre páginas do dashboard — e para
// que chamadas concorrentes com o mesmo filtro compartilhem a mesma requisição
// em vez de multiplicar a carga contra o rate limit da Kommo.
const CACHE_TTL_MS = 60_000;
const cache = new Map<string, { promise: Promise<DatasetResult>; expiresAt: number }>();

function dateKey(date: Date | undefined): string {
  return date ? date.toISOString().slice(0, 10) : "-";
}

interface DatasetOpts {
  createdFrom?: Date;
  createdTo?: Date;
  closedFrom?: Date;
  closedTo?: Date;
}

function cacheKey(opts: DatasetOpts): string {
  return `${dateKey(opts.createdFrom)}_${dateKey(opts.createdTo)}_${dateKey(opts.closedFrom)}_${dateKey(opts.closedTo)}`;
}

/**
 * Busca todos os dados necessários para o dashboard.
 * - Sem KOMMO_SUBDOMAIN/KOMMO_ACCESS_TOKEN configurados: retorna dados de demonstração.
 * - Configurado mas com erro na API (token inválido, rede etc.): retorna erro para a página tratar.
 */
export function loadKommoDataset(opts: DatasetOpts = {}): Promise<DatasetResult> {
  if (!isKommoConfigured()) {
    return Promise.resolve({ dataset: getMockDataset(), isDemo: true, error: null });
  }

  const key = cacheKey(opts);
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.promise;
  }

  const promise = fetchDataset(opts);
  cache.set(key, { promise, expiresAt: Date.now() + CACHE_TTL_MS });
  return promise;
}

async function fetchDataset(opts: DatasetOpts): Promise<DatasetResult> {
  try {
    // Sequencial (não Promise.all): evita disparar ~10 streams de requisição em
    // paralelo contra o rate limit (~7 req/s) da Kommo. O throttle interno do
    // client já limita a taxa; buscar em série mantém isso previsível.
    const account = await getAccount();
    const pipelines = await getPipelines();
    const users = await getUsers();
    const leads = await getLeads({
      createdFrom: opts.createdFrom,
      createdTo: opts.createdTo,
      closedFrom: opts.closedFrom,
      closedTo: opts.closedTo,
    });
    const tasks = await getTasks({ updatedFrom: opts.createdFrom });
    const leadFields = await getCustomFields("leads");
    const contactFields = await getCustomFields("contacts");
    const companyFields = await getCustomFields("companies");
    const catalogs = await getCatalogs();

    const catalogElements: KommoDataset["catalogElements"] = [];
    for (const catalog of catalogs) {
      catalogElements.push(...(await getCatalogElements(catalog.id)));
    }

    return {
      dataset: {
        account,
        pipelines,
        users,
        leads,
        tasks,
        customFields: [...leadFields, ...contactFields, ...companyFields],
        catalogs,
        catalogElements,
      },
      isDemo: false,
      error: null,
    };
  } catch (err) {
    const message =
      err instanceof KommoApiError
        ? err.message
        : "Não foi possível conectar à API da Kommo. Verifique sua conexão e tente novamente.";
    return { dataset: getMockDataset(), isDemo: true, error: message };
  }
}

export interface ProductLinkEventsResult {
  events: KommoProductLinkEvent[];
  isDemo: boolean;
  error: string | null;
}

// Cache separado (não faz parte do dataset principal): só a página Contratos
// precisa desses eventos, então mantê-los à parte evita buscar `/events` toda
// vez que qualquer outra página do dashboard carrega.
const eventsCache = new Map<string, { promise: Promise<ProductLinkEventsResult>; expiresAt: number }>();

export function loadProductLinkEvents(window: { from: Date; to: Date }): Promise<ProductLinkEventsResult> {
  if (!isKommoConfigured()) {
    return Promise.resolve({ events: getMockProductLinkEvents(), isDemo: true, error: null });
  }

  const key = `${dateKey(window.from)}_${dateKey(window.to)}`;
  const cached = eventsCache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.promise;
  }

  const promise = fetchProductLinkEvents(window);
  eventsCache.set(key, { promise, expiresAt: Date.now() + CACHE_TTL_MS });
  return promise;
}

async function fetchProductLinkEvents(window: { from: Date; to: Date }): Promise<ProductLinkEventsResult> {
  try {
    const events = await getProductLinkEvents({ from: window.from, to: window.to });
    return { events, isDemo: false, error: null };
  } catch (err) {
    const message =
      err instanceof KommoApiError
        ? err.message
        : "Não foi possível conectar à API da Kommo. Verifique sua conexão e tente novamente.";
    return { events: getMockProductLinkEvents(), isDemo: true, error: message };
  }
}

/**
 * Um evento (vínculo de produto, mudança de etapa) pode referenciar um lead
 * criado fora da janela de datas usada para buscar `leads` (ex.: lead antigo
 * que só agora recebeu um produto novo, ou avançou de etapa). Essa função
 * completa o registro buscando, por ID, só os leads que faltam — em vez de
 * ampliar a busca principal de leads.
 */
export async function resolveLeadsByIds(baseLeads: KommoLead[], ids: number[]): Promise<Map<number, KommoLead>> {
  const byId = new Map(baseLeads.map((l) => [l.id, l]));
  if (!isKommoConfigured()) return byId; // modo demo: leads já cobrem todos os eventos

  const missing = Array.from(new Set(ids)).filter((id) => !byId.has(id));
  if (missing.length === 0) return byId;

  try {
    const extra = await getLeadsByIds(missing);
    for (const lead of extra) byId.set(lead.id, lead);
  } catch {
    // Sem sorte: os leads que faltarem ficam de fora do mapa — quem usa
    // trata a ausência (ex.: nome de fallback "Lead {id}" em buildClosings).
  }
  return byId;
}

export async function resolveLeadNames(
  leads: KommoLead[],
  events: KommoProductLinkEvent[]
): Promise<Map<number, string>> {
  const byId = await resolveLeadsByIds(leads, events.map((e) => e.leadId));
  const nameById = new Map<number, string>();
  for (const [id, lead] of byId) nameById.set(id, lead.name);
  return nameById;
}

export interface LossReasonsResult {
  lossReasons: KommoLossReason[];
  isDemo: boolean;
  error: string | null;
}

// Motivos de perda mudam raramente — cache único (sem variação por filtro).
let lossReasonsCache: { promise: Promise<LossReasonsResult>; expiresAt: number } | null = null;

export function loadLossReasons(): Promise<LossReasonsResult> {
  if (!isKommoConfigured()) {
    return Promise.resolve({ lossReasons: getMockLossReasons(), isDemo: true, error: null });
  }

  if (lossReasonsCache && lossReasonsCache.expiresAt > Date.now()) {
    return lossReasonsCache.promise;
  }

  const promise = fetchLossReasons();
  lossReasonsCache = { promise, expiresAt: Date.now() + CACHE_TTL_MS };
  return promise;
}

async function fetchLossReasons(): Promise<LossReasonsResult> {
  try {
    const lossReasons = await getLossReasons();
    return { lossReasons, isDemo: false, error: null };
  } catch (err) {
    const message =
      err instanceof KommoApiError
        ? err.message
        : "Não foi possível conectar à API da Kommo. Verifique sua conexão e tente novamente.";
    return { lossReasons: getMockLossReasons(), isDemo: true, error: message };
  }
}

export interface FunnelEventsResult {
  events: KommoStatusChangeEvent[];
  isDemo: boolean;
  error: string | null;
}

// Cache separado (mesmo padrão de `loadProductLinkEvents`). `to` é opcional
// porque a página Leads e funil só usa um `from` (sempre busca até agora —
// ver `RANGE_PRESETS`); a Visão geral já passa `to` pra limitar à mesma
// janela do resto da página (ver buildOverviewSummary/countWonInWindow).
const funnelEventsCache = new Map<string, { promise: Promise<FunnelEventsResult>; expiresAt: number }>();

export function loadFunnelEvents(from: Date | undefined, to?: Date): Promise<FunnelEventsResult> {
  if (!isKommoConfigured()) {
    return Promise.resolve({ events: getMockStatusChangeEvents(), isDemo: true, error: null });
  }

  const key = `${dateKey(from)}_${dateKey(to)}`;
  const cached = funnelEventsCache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.promise;
  }

  const promise = fetchFunnelEvents(from, to);
  funnelEventsCache.set(key, { promise, expiresAt: Date.now() + CACHE_TTL_MS });
  return promise;
}

async function fetchFunnelEvents(from: Date | undefined, to?: Date): Promise<FunnelEventsResult> {
  try {
    const events = await getLeadStatusChangeEvents({ from, to });
    return { events, isDemo: false, error: null };
  } catch (err) {
    const message =
      err instanceof KommoApiError
        ? err.message
        : "Não foi possível conectar à API da Kommo. Verifique sua conexão e tente novamente.";
    return { events: getMockStatusChangeEvents(), isDemo: true, error: message };
  }
}
