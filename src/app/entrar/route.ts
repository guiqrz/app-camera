import { NextRequest, NextResponse } from "next/server";

import { ApiError, trocarTokenDeLogin } from "@/lib/api";

/**
 * Destino do redirect vindo do login.html (site Strix). Le ?token=, troca
 * por sessao real e grava o cookie HttpOnly antes de mandar o professor
 * pra tela principal.
 *
 * Route Handler, nao Server Component: cookie HttpOnly so' pode ser
 * escrito em Server Action, Route Handler ou Middleware -- uma page.tsx
 * comum (mesmo async, sem "use client") lanca em runtime
 * ("Cookies can only be modified in a Server Action or Route Handler"),
 * erro so' visivel testando de verdade, nao no build.
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(new URL("/entrar/erro", request.url));
  }

  let sessao: string;
  try {
    ({ sessao } = await trocarTokenDeLogin(token));
  } catch (causa) {
    if (causa instanceof ApiError) {
      return NextResponse.redirect(new URL("/entrar/erro", request.url));
    }
    throw causa;
  }

  const resposta = NextResponse.redirect(new URL("/", request.url));
  resposta.cookies.set("cupcam_sessao", sessao, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });
  return resposta;
}
