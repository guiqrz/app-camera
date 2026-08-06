import { NextResponse } from "next/server";

import { ApiError, buscarDiarioDaAula } from "@/lib/api";

/**
 * Ponte do diario de classe: conteudo da aula + presenca, pronto pra copiar.
 *
 * Existe pelo mesmo motivo das outras pontes: a chave da API do CUPCAM fica no
 * servidor e nunca chega ao navegador (ver o cabecalho de lib/api.ts).
 *
 * Aqui o 404 significa aula inexistente, e nao "aula sem conteudo" — essa
 * responde 200 com o diario montado pela presenca. E' a diferenca em relacao a'
 * ponte do conteudo da aula, onde o 404 e' esperado e nao e' erro.
 */

export const dynamic = "force-dynamic";

function traduzirFalha(causa: ApiError): { mensagem: string; status: number } {
  switch (causa.status) {
    case 404:
      return { mensagem: "Aula não encontrada.", status: 404 };
    default:
      // 504 e nao 502: a requisicao nao chegou na API do CUPCAM. Mesma
      // distincao das outras pontes.
      return {
        mensagem:
          "Não foi possível falar com a API do CUPCAM. Verifique se o notebook da sala está ligado.",
        status: 504,
      };
  }
}

export async function GET(
  _requisicao: Request,
  { params }: { params: Promise<{ sessaoId: string }> },
) {
  const { sessaoId } = await params;
  const id = Number(sessaoId);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ erro: "Aula inválida." }, { status: 422 });
  }

  try {
    return NextResponse.json(await buscarDiarioDaAula(id));
  } catch (causa) {
    if (causa instanceof ApiError) {
      const { mensagem, status } = traduzirFalha(causa);
      return NextResponse.json({ erro: mensagem }, { status });
    }
    throw causa;
  }
}
