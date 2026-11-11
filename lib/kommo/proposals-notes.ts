import { addLeadNote } from "./api";

/**
 * Mesmo padrão de lib/kommo/contracts-notes.ts, mas para "Propostas
 * Enviadas" — o campo multiselect nativo (`PROPOSTAS_ENVIADAS_FIELD_NAME`
 * em aggregate.ts) só marca "sim/não" por serviço, não conta quantas
 * propostas desse serviço foram enviadas. Uma nota por registro resolve
 * isso: cada clique é uma proposta enviada, sem limite, com a data/hora
 * que a própria Kommo grava.
 */
export const PROPOSAL_NOTE_PREFIX = "[Proposta enviada] ";

export async function registerProposalNote(leadId: number, serviceName: string): Promise<void> {
  await addLeadNote(leadId, `${PROPOSAL_NOTE_PREFIX}${serviceName}`);
}
