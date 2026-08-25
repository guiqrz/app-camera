import { NextResponse } from "next/server";

import { ApiError, gerarResumoDoAluno } from "@/lib/api";

/**
 * Ponte do resumo da aula pro aluno (feature F7).
 *
 * Existe pelo mesmo motivo das outras pontes: a chave da API do CUPCAM fica no
 * servidor e nunca chega ao navegador (ver o cabecalho de lib/api.ts).
 *
 * POST porque GASTA chamada de IA, e porque manda o formato escolhido no
 * corpo. Um GET seria cacheado e repetido a cada F5.
 *
 * NAO PUBLICA NADA. Devolve o texto pro PROFESSOR ver a previa do que o aluno
 * veria. A publicacao depende do login de aluno, que foi adiado — e quando
 * existir, sera' decisao nova com desenho proprio.
 */

export const dynamic = "force-dynamic";

function traduzirFalha(causa: ApiError): { mensagem: string; status: number } {
  switch (causa.status) {
    case 404:
      return { mensagem: "Aula não encontrada.", status: 404 };
    case 502:
      // O backend devolve 502 quando a aula NAO TEM conteudo registrado —
      // caso em que qualquer resumo seria invencao, e o aluno estudaria por
      // ele. O detalhe dele diz isso melhor que uma mensagem generica.
      return {
        mensagem:
          typeof causa.detalhe === "object" &&
          causa.detalhe !== null &&
          "detail" in causa.detalhe &&
          typeof (causa.detalhe as { detail: unknown }).detail === "string"
            ? ((causa.detalhe as { detail: string }).detail as string)
            : "Não foi possível gerar o resumo agora. Tente de novo em instantes.",
        status: 502,
      };
    default:
      // 504 e nao 502: a requisicao nao chegou na API do CUPCAM. Mesma
      // distincao das outras pontes.
      return {
        mensagem: "Não foi possível falar com a API do CUPCAM.",
        status: 504,
      };
  }
}

export async function POST(
  requisicao: Request,
  { params }: { params: Promise<{ sessaoId: string }> },
) {
  const { sessaoId } = await params;
  const id = Number(sessaoId);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ erro: "Aula inválida." }, { status: 422 });
  }

  const corpo = (await requisicao.json()) as { formato?: unknown };
  if (typeof corpo.formato !== "string" || !corpo.formato) {
    return NextResponse.json({ erro: "Escolha um formato." }, { status: 422 });
  }

  try {
    return NextResponse.json(await gerarResumoDoAluno(id, corpo.formato));
  } catch (causa) {
    if (causa instanceof ApiError) {
      const { mensagem, status } = traduzirFalha(causa);
      return NextResponse.json({ erro: mensagem }, { status });
    }
    throw causa;
  }
}
