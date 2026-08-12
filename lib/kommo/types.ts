// Tipos que cobrem apenas os campos da API v4 da Kommo usados nesta aplicação.
// Referência: https://developers.kommo.com/reference

export interface KommoCustomFieldValue {
  field_id: number;
  field_name: string;
  field_code: string | null;
  field_type: string;
  values: { value: string | number; enum_id?: number }[];
}

export interface KommoLead {
  id: number;
  name: string;
  price: number;
  responsible_user_id: number;
  pipeline_id: number;
  status_id: number;
  created_at: number; // unix seconds
  updated_at: number;
  closed_at: number | null;
  closest_task_at: number | null;
  is_deleted?: boolean;
  custom_fields_values: KommoCustomFieldValue[] | null;
  /** IDs dos elementos de catálogo (produtos) vinculados ao lead. */
  catalog_element_ids: number[];
}

export type PipelineStatusType = "regular" | "won" | "lost";

export interface KommoPipelineStatus {
  id: number;
  name: string;
  sort: number;
  color: string;
  pipeline_id: number;
  type: PipelineStatusType;
}

export interface KommoPipeline {
  id: number;
  name: string;
  sort: number;
  is_main: boolean;
  statuses: KommoPipelineStatus[];
}

export interface KommoUser {
  id: number;
  name: string;
  email: string;
  is_active: boolean;
}

export type KommoTaskType = "call" | "meeting" | "follow_up" | string;

export interface KommoTask {
  id: number;
  text: string;
  responsible_user_id: number;
  entity_type: string;
  entity_id: number;
  is_completed: boolean;
  task_type_id: number;
  complete_till: number; // unix seconds (deadline)
  created_at: number;
  updated_at: number;
  result?: { text: string } | null;
}

export interface KommoCustomFieldEnum {
  id: number;
  value: string;
  sort: number;
}

export interface KommoCustomField {
  id: number;
  name: string;
  code: string | null;
  type: string;
  entity_type: "leads" | "contacts" | "companies";
  is_required?: boolean;
  enums?: KommoCustomFieldEnum[];
}

export interface KommoCatalog {
  id: number;
  name: string;
  can_add_elements: boolean;
  type: string;
}

export interface KommoCatalogElement {
  id: number;
  name: string;
  catalog_id: number;
  custom_fields_values: KommoCustomFieldValue[] | null;
}

export interface KommoAccount {
  id: number;
  name: string;
  subdomain: string;
  currency: string;
}

/** Payload agregado usado pelas páginas do dashboard. */
export interface KommoDataset {
  account: KommoAccount | null;
  leads: KommoLead[];
  pipelines: KommoPipeline[];
  users: KommoUser[];
  tasks: KommoTask[];
  customFields: KommoCustomField[];
  catalogs: KommoCatalog[];
  catalogElements: KommoCatalogElement[];
}
