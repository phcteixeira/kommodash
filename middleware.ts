import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, isAuthConfigured, isValidSessionToken } from "@/lib/auth/session";

// Sem KOMMODASH_LOGIN_PASSWORD/KOMMODASH_SESSION_SECRET configurados (ex.:
// ambiente local), não bloqueia — mesmo princípio de fallback do resto do
// app (ver lib/kommo/config.ts).
export async function middleware(request: NextRequest) {
  if (!isAuthConfigured()) return NextResponse.next();

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (await isValidSessionToken(token)) return NextResponse.next();

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", request.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/", "/dashboard/:path*"],
};
