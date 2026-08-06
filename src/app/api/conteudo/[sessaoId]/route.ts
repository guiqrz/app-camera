import { NextResponse } from "next/server";

import { ApiError, buscarConteudoDaAula, editarConteudoDaAula } from "@/lib/api";

/**
 * Ponte do conteudo da aula: o que foi ensinado, e a correcao do professor.
 *
 * Existe pelo mesmo motivo das outras pontes: a chave da API do CUPCAM fica no
 * servidor e nunca chega ao navegador (ver o cabecalho de lib/api.ts).
 *
 * Substituiu a ponte do resumo sob demanda. Uma diferenca de comportamento que
 * importa: o 404 aqui e' ESPERADO e nao e' erro — significa "esta aula ainda
 * nao tem registro", e a tela mostra um aviso calmo em vez de vermelho.
 */

export const dynamic = "force-dynamic";

/** Aula invalida na URL. Extraido porque os dois handlers validam igual. */
function idDaAula(sessaoId: string): number | null {
  const id = Number(sessaoId);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function traduzirFalha(causa: ApiError): { mensagem: string; status: number } {
  switch (causa.status) {
    case 404:
      return {
        mensagem: "Esta aula ainda não tem conteúdo registrado.",
        status: 404,
      };
    case 422:
      return {
        mensagem: "O texto ficou grande demais. Encurte e tente de novo.",
        status: 422,
      };
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
  const id = idDaAula(sessaoId);
  if (id === null) {
    return NextResponse.json({ erro: "Aula inválida." }, { status: 422 });
  }

  try {
    return NextResponse.json(await buscarConteudoDaAula(id));
  } catch (causa) {
    if (causa instanceof ApiError) {
      const { mensagem, status } = traduzirFalha(causa);
      return NextResponse.json({ erro: mensagem }, { status });
    }
    throw causa;
  }
}

export async function PUT(
  requisicao: Request,
  { params }: { params: Promise<{ sessaoId: string }> },
) {
  const { sessaoId } = await params;
  const id = idDaAula(sessaoId);
  if (id === null) {
    return NextResponse.json({ erro: "Aula inválida." }, { status: 422 });
  }

  // Corpo ilegivel vira 422 aqui e nao 500: JSON quebrado e' entrada invalida,
  // nao defeito do servidor.
  let corpo: unknown;
  try {
    corpo = await requisicao.json();
  } catch {
    return NextResponse.json({ erro: "Correção inválida." }, { status: 422 });
  }

  const { topicos, resumo, ate_onde } = (corpo ?? {}) as {
    topicos?: unknown;
    resumo?: unknown;
    ate_onde?: unknown;
  };

  // Validado aqui tambem, e nao so' no backend: a ponte nao deve encaminhar
  // corpo malformado, e a mensagem que volta e' escrita pra tela em vez do
  // detail cru do Pydantic.
  if (
    !Array.isArray(topicos) ||
    !topicos.every((t) => typeof t === "string") ||
    typeof resumo !== "string" ||
    typeof ate_onde !== "string"
  ) {
    return NextResponse.json({ erro: "Correção inválida." }, { status: 422 });
  }

  try {
    return NextResponse.json(
      await editarConteudoDaAula(id, { topicos, resumo, ate_onde }),
    );
  } catch (causa) {
    if (causa instanceof ApiError) {
      const { mensagem, status } = traduzirFalha(causa);
      return NextResponse.json({ erro: mensagem }, { status });
    }
    throw causa;
  }
}
