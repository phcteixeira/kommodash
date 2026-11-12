/**
 * Login por senha única compartilhada (sem banco de dados e sem contas
 * individuais — decisão explícita dada o tamanho da equipe). A sessão é um
 * cookie assinado por HMAC (`${expiresAt}.${assinatura}`), verificado sem
 * estado no servidor — por isso dá pra checar dentro do middleware (roda no
 * Edge Runtime, sem acesso ao módulo `crypto` do Node). Usa a Web Crypto API
 * (`crypto.subtle`), disponível tanto no Edge quanto no Node.
 */

export const SESSION_COOKIE_NAME = "kommodash_session";
export const SESSION_DURATION_SECONDS = 30 * 24 * 60 * 60; // 30 dias

export function isAuthConfigured(): boolean {
  return Boolean(process.env.KOMMODASH_LOGIN_PASSWORD && process.env.KOMMODASH_SESSION_SECRET);
}

async function hmacHex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Comparação em tempo constante — evita vazar por timing quanto da string
// bate, já que nem Node nem Web Crypto expõem um `timingSafeEqual` que
// funcione em ambos os runtimes (Edge e Node) ao mesmo tempo.
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function isLoginPasswordValid(provided: string): boolean {
  const expected = process.env.KOMMODASH_LOGIN_PASSWORD ?? "";
  if (!expected || !provided) return false;
  return constantTimeEqual(expected, provided);
}

export async function createSessionToken(): Promise<string> {
  const secret = process.env.KOMMODASH_SESSION_SECRET ?? "";
  const expiresAt = Date.now() + SESSION_DURATION_SECONDS * 1000;
  const signature = await hmacHex(secret, String(expiresAt));
  return `${expiresAt}.${signature}`;
}

export async function isValidSessionToken(token: string | undefined | null): Promise<boolean> {
  const secret = process.env.KOMMODASH_SESSION_SECRET ?? "";
  if (!token || !secret) return false;
  const [expiresAtRaw, signature] = token.split(".");
  const expiresAt = Number(expiresAtRaw);
  if (!expiresAtRaw || !signature || !Number.isFinite(expiresAt) || expiresAt < Date.now()) return false;
  const expected = await hmacHex(secret, expiresAtRaw);
  return constantTimeEqual(expected, signature);
}
