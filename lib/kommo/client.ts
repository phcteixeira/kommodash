import { kommoBaseUrl, kommoConfig, isKommoConfigured } from "./config";

export class KommoApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "KommoApiError";
    this.status = status;
  }
}

const MIN_REQUEST_GAP_MS = 150; // fica bem abaixo do limite de ~7 req/s da Kommo
let lastRequestAt = 0;

async function throttle() {
  const wait = lastRequestAt + MIN_REQUEST_GAP_MS - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastRequestAt = Date.now();
}

/**
 * Faz uma chamada autenticada à API v4 da Kommo, com retry/backoff em 429
 * e erro tipado em falhas de autenticação/HTTP.
 */
export async function kommoFetch<T>(
  path: string,
  init?: RequestInit,
  { retries = 3 }: { retries?: number } = {}
): Promise<T> {
  if (!isKommoConfigured()) {
    throw new KommoApiError(
      "Kommo não está configurado (defina KOMMO_SUBDOMAIN e KOMMO_ACCESS_TOKEN).",
      0
    );
  }

  const url = path.startsWith("http") ? path : `${kommoBaseUrl()}${path}`;

  for (let attempt = 0; attempt <= retries; attempt++) {
    await throttle();

    const res = await fetch(url, {
      ...init,
      headers: {
        Authorization: `Bearer ${kommoConfig.accessToken}`,
        "Content-Type": "application/json",
        ...init?.headers,
      },
      cache: "no-store",
    });

    if (res.status === 429 && attempt < retries) {
      const retryAfter = Number(res.headers.get("retry-after"));
      const delay = Number.isFinite(retryAfter) && retryAfter > 0
        ? retryAfter * 1000
        : 500 * 2 ** attempt;
      await new Promise((r) => setTimeout(r, delay));
      continue;
    }

    if (res.status === 401 || res.status === 403) {
      throw new KommoApiError(
        "Token inválido ou sem permissão para acessar a conta Kommo.",
        res.status
      );
    }

    if (res.status === 204) {
      return {} as T;
    }

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new KommoApiError(
        `Erro na API da Kommo (${res.status}) em ${path}: ${body.slice(0, 300)}`,
        res.status
      );
    }

    return (await res.json()) as T;
  }

  throw new KommoApiError(`Limite de requisições excedido em ${path}.`, 429);
}

interface EmbeddedListResponse<K extends string, T> {
  _page?: number;
  _links?: { self: { href: string }; next?: { href: string } };
  _embedded?: Record<K, T[]>;
}

/**
 * Percorre todas as páginas de um endpoint de listagem da Kommo (limit=250)
 * e retorna a lista completa. `maxPages` evita loops descontrolados em
 * contas muito grandes.
 */
export async function kommoFetchAllPages<K extends string, T>(
  path: string,
  embeddedKey: K,
  { maxPages = 40, limit = 250 }: { maxPages?: number; limit?: number } = {}
): Promise<T[]> {
  const results: T[] = [];
  const separator = path.includes("?") ? "&" : "?";

  for (let page = 1; page <= maxPages; page++) {
    let data: EmbeddedListResponse<K, T>;
    try {
      data = await kommoFetch<EmbeddedListResponse<K, T>>(
        `${path}${separator}limit=${limit}&page=${page}`
      );
    } catch (err) {
      // A Kommo retorna 204/404 quando a página está vazia ou não há registros.
      if (err instanceof KommoApiError && (err.status === 404 || err.status === 0)) {
        if (err.status === 0) throw err;
        break;
      }
      throw err;
    }

    const items = data._embedded?.[embeddedKey] ?? [];
    results.push(...items);

    if (items.length < limit || !data._links?.next) break;
  }

  return results;
}
