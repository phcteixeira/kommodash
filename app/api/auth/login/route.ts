import { NextRequest, NextResponse } from "next/server";
import {
  SESSION_COOKIE_NAME,
  SESSION_DURATION_SECONDS,
  createSessionToken,
  isAuthConfigured,
  isLoginPasswordValid,
} from "@/lib/auth/session";

function safeNextPath(raw: string): string {
  // Só aceita caminho relativo dentro do próprio app — evita open redirect
  // via o parâmetro `next` vindo do form.
  return raw.startsWith("/") && !raw.startsWith("//") ? raw : "/dashboard";
}

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const password = String(form.get("password") ?? "");
  const next = safeNextPath(String(form.get("next") ?? "/dashboard"));

  if (!isAuthConfigured() || !isLoginPasswordValid(password)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("error", "1");
    loginUrl.searchParams.set("next", next);
    return NextResponse.redirect(loginUrl, { status: 303 });
  }

  const response = NextResponse.redirect(new URL(next, request.url), { status: 303 });
  response.cookies.set(SESSION_COOKIE_NAME, await createSessionToken(), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
  });
  return response;
}
