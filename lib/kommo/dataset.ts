import { isKommoConfigured } from "./config";
import {
  getAccount,
  getCatalogElements,
  getCatalogs,
  getCustomFields,
  getLeads,
  getPipelines,
  getTasks,
  getUsers,
} from "./api";
import { getMockDataset } from "./mock-data";
import type { KommoDataset } from "./types";
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

function cacheKey(opts: { createdFrom?: Date }): string {
  // Agrupa por dia para não gerar uma chave nova a cada milissegundo.
  return opts.createdFrom ? opts.createdFrom.toISOString().slice(0, 10) : "all";
}

/**
 * Busca todos os dados necessários para o dashboard.
 * - Sem KOMMO_SUBDOMAIN/KOMMO_ACCESS_TOKEN configurados: retorna dados de demonstração.
 * - Configurado mas com erro na API (token inválido, rede etc.): retorna erro para a página tratar.
 */
export function loadKommoDataset(opts: { createdFrom?: Date } = {}): Promise<DatasetResult> {
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

async function fetchDataset(opts: { createdFrom?: Date }): Promise<DatasetResult> {
  try {
    // Sequencial (não Promise.all): evita disparar ~10 streams de requisição em
    // paralelo contra o rate limit (~7 req/s) da Kommo. O throttle interno do
    // client já limita a taxa; buscar em série mantém isso previsível.
    const account = await getAccount();
    const pipelines = await getPipelines();
    const users = await getUsers();
    const leads = await getLeads({ createdFrom: opts.createdFrom });
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
