import { NextResponse, type NextRequest } from "next/server";

import { comSessao, lerCorpo, respostaDeErro } from "@/app/api/conta/_lib/ponte";
import { alterarMeuNome } from "@/lib/api";
import { gravarCookieDeSessao } from "@/lib/sessao-cookie";

export const dynamic = "force-dynamic";

/**
 * Salva o nome e REGRAVA o cookie assinado na hora: sem isso a barra lateral
 * so' mostraria o nome novo na revalidacao seguinte (ate' 5 minutos).
 */
export async function PATCH(request: NextRequest) {
  const corpo = await lerCorpo(request);
  if (typeof corpo?.nome !== "string") return respostaDeErro("Nome inválido.", 400);
  return comSessao(request, async (lida) => {
    const { nome } = await alterarMeuNome(lida.sessao, corpo.nome as string);
    const resposta = NextResponse.json({ nome });
    await gravarCookieDeSessao(resposta, { ...lida, nome });
    return resposta;
  });
}
