import { addLeadNote } from "./api";

/**
 * V1 do registro manual de contratos: um botão no card do lead grava uma
 * nota com esse prefixo a cada contrato registrado — cada clique é uma
 * nota nova, sem limite, com `created_at` gravado pela própria Kommo. Ao
 * contrário do vínculo de "Produtos" (catalog_element_ids), não há
 * deduplicação nem ambiguidade de "clique errado": aqui cada registro é
 * uma ação explícita da pessoa.
 *
 * Ainda não é lido por `buildClosings`/Contratos — isso fica para quando
 * decidirmos se substitui ou convive com o vínculo de Produtos (ver
 * conversa sobre a v1 do registro de contratos).
 */
export const CONTRACT_NOTE_PREFIX = "[Contrato registrado] ";

export async function registerContractNote(leadId: number, productName: string): Promise<void> {
  await addLeadNote(leadId, `${CONTRACT_NOTE_PREFIX}${productName}`);
}
