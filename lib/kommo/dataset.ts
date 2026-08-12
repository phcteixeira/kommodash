import { isKommoConfigured } from "./config";
import {
  getAccount,
  getCatalogElements,
  getCatalogs,
  getCustomFields,
  getLeads,
  getPipelines,
  getProductLinkEvents,
  getTasks,
  getUsers,
} from "./api";
import { getMockDataset, getMockProductLinkEvents } from "./mock-data";
import type { KommoDataset, KommoProductLinkEvent } from "./types";
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

function cacheKey(opts: { createdFrom?: Date; createdTo?: Date }): string {
  return `${dateKey(opts.createdFrom)}_${dateKey(opts.createdTo)}`;
}

/**
 * Busca todos os dados necessários para o dashboard.
 * - Sem KOMMO_SUBDOMAIN/KOMMO_ACCESS_TOKEN configurados: retorna dados de demonstração.
 * - Configurado mas com erro na API (token inválido, rede etc.): retorna erro para a página tratar.
 */
export function loadKommoDataset(opts: { createdFrom?: Date; createdTo?: Date } = {}): Promise<DatasetResult> {
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

async function fetchDataset(opts: { createdFrom?: Date; createdTo?: Date }): Promise<DatasetResult> {
  try {
    // Sequencial (não Promise.all): evita disparar ~10 streams de requisição em
    // paralelo contra o rate limit (~7 req/s) da Kommo. O throttle interno do
    // client já limita a taxa; buscar em série mantém isso previsível.
    const account = await getAccount();
    const pipelines = await getPipelines();
    const users = await getUsers();
    const leads = await getLeads({ createdFrom: opts.createdFrom, createdTo: opts.createdTo });
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
