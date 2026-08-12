import { kommoFetch, kommoFetchAllPages } from "./client";
import type {
  KommoAccount,
  KommoCatalog,
  KommoCatalogElement,
  KommoCustomField,
  KommoLead,
  KommoPipeline,
  KommoPipelineStatus,
  KommoProductLinkEvent,
  KommoTask,
  KommoUser,
} from "./types";

// IDs reservados pela Kommo/amoCRM: são fixos em todas as contas e pipelines.
const WON_STATUS_ID = 142;
const LOST_STATUS_ID = 143;

function normalizeStatusType(raw: {
  id: number;
  type?: number;
}): "regular" | "won" | "lost" {
  if (raw.type === 1) return "won";
  if (raw.type === 2) return "lost";
  if (raw.id === WON_STATUS_ID) return "won";
  if (raw.id === LOST_STATUS_ID) return "lost";
  return "regular";
}

export interface LeadFilter {
  createdFrom?: Date;
  createdTo?: Date;
}

export async function getAccount(): Promise<KommoAccount> {
  const data = await kommoFetch<{
    id: number;
    name: string;
    subdomain: string;
    currency?: string;
  }>("/account");
  return {
    id: data.id,
    name: data.name,
    subdomain: data.subdomain,
    currency: data.currency ?? "BRL",
  };
}

type RawLead = Omit<KommoLead, "catalog_element_ids"> & {
  _embedded?: { catalog_elements?: { id: number }[] };
};

export async function getLeads(filter: LeadFilter = {}): Promise<KommoLead[]> {
  const params = new URLSearchParams();
  if (filter.createdFrom) {
    params.set("filter[created_at][from]", String(Math.floor(filter.createdFrom.getTime() / 1000)));
  }
  if (filter.createdTo) {
    params.set("filter[created_at][to]", String(Math.floor(filter.createdTo.getTime() / 1000)));
  }
  params.set("with", "catalog_elements");
  const query = params.toString();
  const path = `/leads?${query}`;

  const raw = await kommoFetchAllPages<"leads", RawLead>(path, "leads");
  return raw.map((lead) => ({
    ...lead,
    custom_fields_values: lead.custom_fields_values ?? [],
    catalog_element_ids: (lead._embedded?.catalog_elements ?? []).map((e) => e.id),
  }));
}

type RawPipelineStatus = Omit<KommoPipelineStatus, "type" | "pipeline_id"> & { type?: number };

interface RawPipeline extends Omit<KommoPipeline, "statuses"> {
  _embedded?: { statuses: RawPipelineStatus[] };
}

export async function getPipelines(): Promise<KommoPipeline[]> {
  const data = await kommoFetch<{ _embedded?: { pipelines: RawPipeline[] } }>(
    "/leads/pipelines"
  );
  const pipelines = data._embedded?.pipelines ?? [];
  return pipelines.map((p) => ({
    id: p.id,
    name: p.name,
    sort: p.sort,
    is_main: p.is_main,
    statuses: (p._embedded?.statuses ?? []).map((s) => ({
      id: s.id,
      name: s.name,
      sort: s.sort,
      color: s.color,
      pipeline_id: p.id,
      type: normalizeStatusType(s),
    })),
  }));
}

export async function getUsers(): Promise<KommoUser[]> {
  return kommoFetchAllPages<"users", KommoUser>("/users", "users");
}

export interface TaskFilter {
  updatedFrom?: Date;
}

export async function getTasks(filter: TaskFilter = {}): Promise<KommoTask[]> {
  const params = new URLSearchParams();
  if (filter.updatedFrom) {
    params.set("filter[updated_at][from]", String(Math.floor(filter.updatedFrom.getTime() / 1000)));
  }
  const query = params.toString();
  const path = `/tasks${query ? `?${query}` : ""}`;
  return kommoFetchAllPages<"tasks", KommoTask>(path, "tasks");
}

export async function getCustomFields(
  entity: "leads" | "contacts" | "companies"
): Promise<KommoCustomField[]> {
  const raw = await kommoFetchAllPages<"custom_fields", Omit<KommoCustomField, "entity_type">>(
    `/${entity}/custom_fields`,
    "custom_fields"
  );
  return raw.map((f) => ({ ...f, entity_type: entity }));
}

export async function getCatalogs(): Promise<KommoCatalog[]> {
  return kommoFetchAllPages<"catalogs", KommoCatalog>("/catalogs", "catalogs");
}

export async function getCatalogElements(catalogId: number): Promise<KommoCatalogElement[]> {
  const raw = await kommoFetchAllPages<"elements", Omit<KommoCatalogElement, "catalog_id">>(
    `/catalogs/${catalogId}/elements`,
    "elements"
  );
  return raw.map((e) => ({ ...e, catalog_id: catalogId }));
}

export interface EventDateFilter {
  from?: Date;
  to?: Date;
}

interface RawEvent {
  id: string;
  entity_id: number;
  created_at: number;
  value_after?: { link?: { entity?: { type: unknown; id: number } } }[];
}

/**
 * Busca eventos `entity_linked` de leads (vínculo com produto, contato ou
 * empresa) e retorna apenas os que representam um produto sendo vinculado
 * a um lead ("fechamento").
 *
 * A API da Kommo não expõe um tipo de evento dedicado a "produto vinculado":
 * vínculos de contato/empresa trazem `link.entity.type` como texto (ex.:
 * "contact"), enquanto vínculos de produto trazem `type: false` — uma
 * peculiaridade não documentada, confirmada manualmente contra uma conta
 * real. Por isso `aggregate.ts` ainda cruza o resultado com a lista de
 * elementos de catálogo conhecidos antes de contabilizar.
 */
export async function getProductLinkEvents(filter: EventDateFilter = {}): Promise<KommoProductLinkEvent[]> {
  const params = new URLSearchParams();
  params.set("filter[type][]", "entity_linked");
  params.set("filter[entity]", "leads");
  if (filter.from) {
    params.set("filter[created_at][from]", String(Math.floor(filter.from.getTime() / 1000)));
  }
  if (filter.to) {
    params.set("filter[created_at][to]", String(Math.floor(filter.to.getTime() / 1000)));
  }
  const path = `/events?${params.toString()}`;

  const raw = await kommoFetchAllPages<"events", RawEvent>(path, "events");

  const events: KommoProductLinkEvent[] = [];
  for (const event of raw) {
    const link = event.value_after?.[0]?.link?.entity;
    if (!link || link.type !== false) continue;
    events.push({ leadId: event.entity_id, catalogElementId: link.id, linkedAt: event.created_at });
  }
  return events;
}
