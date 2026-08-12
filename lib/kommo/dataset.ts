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

/**
 * Busca todos os dados necessários para o dashboard.
 * - Sem KOMMO_SUBDOMAIN/KOMMO_ACCESS_TOKEN configurados: retorna dados de demonstração.
 * - Configurado mas com erro na API (token inválido, rede etc.): retorna erro para a página tratar.
 */
export async function loadKommoDataset(opts: { createdFrom?: Date } = {}): Promise<DatasetResult> {
  if (!isKommoConfigured()) {
    return { dataset: getMockDataset(), isDemo: true, error: null };
  }

  try {
    const [account, pipelines, users, leads, tasks, leadFields, contactFields, companyFields, catalogs] =
      await Promise.all([
        getAccount(),
        getPipelines(),
        getUsers(),
        getLeads({ createdFrom: opts.createdFrom }),
        getTasks({ updatedFrom: opts.createdFrom }),
        getCustomFields("leads"),
        getCustomFields("contacts"),
        getCustomFields("companies"),
        getCatalogs(),
      ]);

    const catalogElements = (
      await Promise.all(catalogs.map((c) => getCatalogElements(c.id)))
    ).flat();

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
