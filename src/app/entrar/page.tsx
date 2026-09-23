import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { ApiError, trocarTokenDeLogin } from "@/lib/api";

/**
 * Destino do redirect vindo do login.html (site Strix). Le ?token=, troca
 * por sessao real e grava o cookie HttpOnly antes de mandar o professor
 * pra tela principal.
 *
 * Server Component (sem "use client"): o cookie precisa ser HttpOnly, e
 * so' o servidor pode grava-lo assim -- JS de navegador nunca toca a
 * sessao, mesmo padrao de protecao que a X-API-Key ja usa neste projeto.
 *
 * Chama trocarTokenDeLogin() DIRETO, sem passar por uma rota /api/ propria
 * -- diferente do resto do app-cupcam (que sempre usa uma ponte /api/
 * porque componentes "use client" nao podem importar lib/api.ts, que e'
 * server-only). Esta pagina JA' e' Server Component, entao a ponte extra
 * seria um HTTP redundante contra o proprio servidor.
 */
export default async function PaginaEntrar({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token) {
    redirect("/entrar/erro");
  }

  let sessao: string;
  try {
    ({ sessao } = await trocarTokenDeLogin(token));
  } catch (causa) {
    if (causa instanceof ApiError) {
      redirect("/entrar/erro");
    }
    throw causa;
  }

  const cookieStore = await cookies();
  cookieStore.set("cupcam_sessao", sessao, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });

  redirect("/");
}
