import { NextResponse, type NextRequest } from "next/server";

import { comSessao } from "@/app/api/conta/_lib/ponte";
import { sairDeTodos } from "@/lib/api";
import { apagarCookieDeSessao } from "@/lib/sessao-cookie";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  return comSessao(request, async (lida) => {
    await sairDeTodos(lida.sessao);
    const resposta = NextResponse.json({ destino: "/entrar/iniciar" });
    apagarCookieDeSessao(resposta);
    return resposta;
  });
}
