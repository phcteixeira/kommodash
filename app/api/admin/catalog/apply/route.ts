import { NextRequest, NextResponse } from "next/server";
import { isValidAdminSecret } from "@/lib/kommo-agent/adminConfig";
import { createCatalogElements, renameCatalogElements } from "@/lib/kommo/api";

interface ApplyBody {
  secret?: string;
  catalogId?: number;
  rename?: { id: number; name: string }[];
  create?: string[];
}

/**
 * Aplica um plano explícito de ajuste no catálogo de produtos — nada é
 * decidido aqui, o plano (o que renomear, o que criar) vem pronto no
 * corpo da chamada. Rota administrativa pontual, ver app/api/admin/catalog.
 */
export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as ApplyBody | null;
  if (!isValidAdminSecret(body?.secret ?? null)) {
    return NextResponse.json({ ok: false, message: "Não autorizado." }, { status: 401 });
  }

  const catalogId = Number(body?.catalogId);
  if (!Number.isFinite(catalogId)) {
    return NextResponse.json({ ok: false, message: "catalogId inválido." }, { status: 400 });
  }

  try {
    await renameCatalogElements(catalogId, body?.rename ?? []);
    const created = await createCatalogElements(catalogId, body?.create ?? []);
    return NextResponse.json({ ok: true, renamedCount: body?.rename?.length ?? 0, created });
  } catch (err) {
    console.error("[admin/catalog/apply]", err);
    return NextResponse.json({ ok: false, message: "Falha ao aplicar alterações." }, { status: 500 });
  }
}
