import { timingSafeEqual } from "crypto";

/**
 * Segredo pra rotas administrativas pontuais (ex.: app/api/admin/catalog) —
 * usadas só por mim (via curl/MCP), nunca pelo navegador ou pelo widget.
 * Mesmo padrão de lib/kommo-agent/contractsWidgetConfig.ts.
 */
export function isValidAdminSecret(provided: string | null): boolean {
  const expected = process.env.ADMIN_SYNC_SECRET ?? "";
  if (!expected || !provided) return false;
  const expectedBuf = Buffer.from(expected);
  const actualBuf = Buffer.from(provided);
  return expectedBuf.length === actualBuf.length && timingSafeEqual(expectedBuf, actualBuf);
}
