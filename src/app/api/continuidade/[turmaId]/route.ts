import { NextResponse } from "next/server";

import { ApiError, buscarContinuidadeDaTurma } from "@/lib/api";

/**
 * Ponte do "onde parei nesta turma": historico do conteudo + paragrafo da IA.
 *
 * Existe pelo mesmo motivo das outras pontes: a chave da API do CUPCAM fica no
 * servidor e nunca chega ao navegador (ver o cabecalho de lib/api.ts).
 *
 * Diferente da ponte do conteudo da aula, aqui o 404 e' erro de verdade —
 * significa turma inexistente. Turma SEM historico devolve 200 com a lista
 * vazia, porque "esta turma ainda nao tem aula registrada" e' uma resposta
 * legitima, nao uma falha.
 */

export const dynamic = "force-dynamic";

function traduzirFalha(causa: ApiError): { mensagem: string; status: number } {
  switch (causa.status) {
    case 404:
      return { mensagem: "Turma não encontrada.", status: 404 };
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
  { params }: { params: Promise<{ turmaId: string }> },
) {
  const { turmaId } = await params;
  const id = Number(turmaId);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ erro: "Turma inválida." }, { status: 422 });
  }

  try {
    return NextResponse.json(await buscarContinuidadeDaTurma(id));
  } catch (causa) {
    if (causa instanceof ApiError) {
      const { mensagem, status } = traduzirFalha(causa);
      return NextResponse.json({ erro: mensagem }, { status });
    }
    throw causa;
  }
}
