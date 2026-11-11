import { addLeadNote } from "./api";

/**
 * Mesmo padrão de lib/kommo/proposals-notes.ts e contracts-notes.ts, mas
 * para "Demandas Identificadas" — campo nativo chamado "Serviço" na Kommo
 * (`SERVICO_FIELD_NAME` em aggregate.ts), 1ª etapa do funil Serviço →
 * Propostas Enviadas → Produtos. O multiselect nativo só marca "sim/não"
 * por serviço, não conta quantas vezes uma demanda foi identificada pro
 * mesmo lead — uma nota por registro resolve isso.
 */
export const DEMAND_NOTE_PREFIX = "[Demanda identificada] ";

export async function registerDemandNote(leadId: number, serviceName: string): Promise<void> {
  await addLeadNote(leadId, `${DEMAND_NOTE_PREFIX}${serviceName}`);
}
