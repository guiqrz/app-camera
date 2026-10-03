import { NextResponse, type NextRequest } from "next/server";

import { comSessao, lerCorpo, respostaDeErro } from "@/app/api/conta/_lib/ponte";
import { trocarMinhaSenha } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const corpo = await lerCorpo(request);
  if (typeof corpo?.senhaAtual !== "string" || typeof corpo?.senhaNova !== "string") {
    return respostaDeErro("Preencha a senha atual e a nova.", 400);
  }
  return comSessao(request, async (lida) => {
    await trocarMinhaSenha(lida.sessao, corpo.senhaAtual as string, corpo.senhaNova as string);
    return NextResponse.json({ ok: true });
  });
}
