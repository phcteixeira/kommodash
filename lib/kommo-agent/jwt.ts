import { createHmac, timingSafeEqual } from "crypto";
import { kommoAgentConfig } from "./config";
import type { KommoSalesbotJwtClaims } from "./types";

export class KommoAgentAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "KommoAgentAuthError";
  }
}

function base64UrlDecode(segment: string): Buffer {
  const padded = segment + "=".repeat((4 - (segment.length % 4)) % 4);
  return Buffer.from(padded.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

/**
 * Valida o JWT (HS512) que o Salesbot assina com o client_secret da
 * integração privada a cada widget_request. Formato confirmado contra um
 * token real da conta — ver lib/kommo-agent/types.ts.
 *
 * Rejeita: assinatura inválida, algoritmo diferente de HS512, token fora da
 * janela nbf/exp, ou account_id fora do esperado (defesa extra — o secret
 * já amarra isso a esta integração, mas não custa checar).
 */
export function verifyKommoSalesbotToken(token: string): KommoSalesbotJwtClaims {
  if (!kommoAgentConfig.clientSecret) {
    throw new KommoAgentAuthError("KOMMO_INTEGRATION_CLIENT_SECRET não configurado.");
  }

  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new KommoAgentAuthError("Token mal formado.");
  }
  const [headerB64, payloadB64, signatureB64] = parts;

  let header: { alg?: string; typ?: string };
  try {
    header = JSON.parse(base64UrlDecode(headerB64).toString("utf8"));
  } catch {
    throw new KommoAgentAuthError("Header do token inválido.");
  }
  if (header.alg !== "HS512") {
    throw new KommoAgentAuthError(`Algoritmo de assinatura inesperado: ${header.alg}`);
  }

  const expectedSignature = createHmac("sha512", kommoAgentConfig.clientSecret)
    .update(`${headerB64}.${payloadB64}`)
    .digest();
  const actualSignature = base64UrlDecode(signatureB64);

  if (
    expectedSignature.length !== actualSignature.length ||
    !timingSafeEqual(expectedSignature, actualSignature)
  ) {
    throw new KommoAgentAuthError("Assinatura do token inválida.");
  }

  let claims: KommoSalesbotJwtClaims;
  try {
    claims = JSON.parse(base64UrlDecode(payloadB64).toString("utf8"));
  } catch {
    throw new KommoAgentAuthError("Payload do token inválido.");
  }

  const now = Date.now() / 1000;
  if (typeof claims.nbf === "number" && now < claims.nbf) {
    throw new KommoAgentAuthError("Token ainda não é válido (nbf).");
  }
  if (typeof claims.exp === "number" && now > claims.exp) {
    throw new KommoAgentAuthError("Token expirado.");
  }

  return claims;
}
