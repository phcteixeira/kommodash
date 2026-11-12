import { DISCONTINUED_PRODUCT_NAMES } from "./catalog-config";
import type { KommoNote } from "./types";

/**
 * Um registro manual feito pelo widget (Demanda identificada, Proposta
 * enviada ou Contrato) — uma nota de texto com prefixo fixo
 * (`[Demanda identificada] `, `[Proposta enviada] `, `[Contrato registrado] `)
 * escrita em `lib/kommo/{demands,proposals,contracts}-notes.ts`. `value` é o
 * nome do serviço/produto, igual ao texto depois do prefixo.
 */
export interface ManualRegistration {
  leadId: number;
  value: string;
  at: number; // unix seconds — created_at da nota (data/hora real do clique)
}

/**
 * Extrai os registros de um prefixo específico a partir de todas as notas
 * da conta. Registros sob um nome descontinuado (ver catalog-config.ts)
 * ficam de fora — decisão do negócio ao aposentar um produto/serviço.
 */
export function extractRegistrations(notes: KommoNote[], prefix: string): ManualRegistration[] {
  const registrations: ManualRegistration[] = [];
  for (const note of notes) {
    const text = note.params?.text;
    if (!text || !text.startsWith(prefix)) continue;
    const value = text.slice(prefix.length);
    if (DISCONTINUED_PRODUCT_NAMES.has(value)) continue;
    registrations.push({ leadId: note.entity_id, value, at: note.created_at });
  }
  return registrations;
}
