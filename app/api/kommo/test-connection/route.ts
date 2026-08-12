import { NextResponse } from "next/server";
import { isKommoConfigured } from "@/lib/kommo/config";
import { getAccount } from "@/lib/kommo/api";
import { KommoApiError } from "@/lib/kommo/client";

export async function GET() {
  if (!isKommoConfigured()) {
    return NextResponse.json(
      { ok: false, message: "KOMMO_SUBDOMAIN e/ou KOMMO_ACCESS_TOKEN não configurados." },
      { status: 400 }
    );
  }

  try {
    const account = await getAccount();
    return NextResponse.json({ ok: true, account });
  } catch (err) {
    const message = err instanceof KommoApiError ? err.message : "Falha ao conectar com a Kommo.";
    const status = err instanceof KommoApiError && err.status ? err.status : 500;
    return NextResponse.json({ ok: false, message }, { status });
  }
}
