import { NextResponse } from "next/server";

import { ApiError, gerarConteudoDaAula } from "@/lib/api";

/**
 * Ponte do botao "Gerar resumo": pede ao backend o resumo que nao saiu no fim
 * da aula (Gemini sobrecarregado, por exemplo).
 *
 * Rota propria, e nao um POST na ponte do conteudo: la' GET/PUT so' leem e
 * gravam o banco; aqui cada chamada custa uma ida ao modelo.
 */

export const dynamic = "force-dynamic";

function traduzirFalha(causa: ApiError): { mensagem: string; status: number } {
  switch (causa.status) {
    case 404:
      return { mensagem: "Aula não encontrada.", status: 404 };
    case 409: {
      // O backend explica qual dos dois casos foi (sem fonte, ou ja editado).
      const detalhe = (causa.detalhe as { detail?: unknown } | undefined)?.detail;
      return {
        mensagem:
          typeof detalhe === "string"
            ? `Não dá para gerar: ${detalhe}.`
            : "Não dá para gerar o resumo desta aula.",
        status: 409,
      };
    }
    case 503:
      return {
        mensagem:
          "A IA está sobrecarregada agora. Tente de novo em alguns instantes.",
        status: 503,
      };
    default:
      return {
        mensagem:
          "Não foi possível falar com a API do CUPCAM. Tente de novo em instantes.",
        status: 504,
      };
  }
}

export async function POST(
  _requisicao: Request,
  { params }: { params: Promise<{ sessaoId: string }> },
) {
  const { sessaoId } = await params;
  const id = Number(sessaoId);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ erro: "Aula inválida." }, { status: 422 });
  }

  try {
    return NextResponse.json(await gerarConteudoDaAula(id));
  } catch (causa) {
    if (causa instanceof ApiError) {
      const { mensagem, status } = traduzirFalha(causa);
      return NextResponse.json({ erro: mensagem }, { status });
    }
    throw causa;
  }
}
