import { NextResponse } from "next/server";

import {
  ApiError,
  excluirCronograma,
  preverCronograma,
  salvarCronograma,
} from "@/lib/api";

/**
 * Ponte do cronograma do bimestre (feature F9).
 *
 * Existe pelo mesmo motivo das outras pontes: a chave da API do CUPCAM fica no
 * servidor e nunca chega ao navegador (ver o cabecalho de lib/api.ts).
 *
 * Tres verbos, tres significados diferentes:
 *
 *   POST    previa — distribui os conteudos pelas datas SEM gravar. E' o que o
 *           professor ve enquanto edita a lista.
 *   PUT     grava o cronograma, substituindo o do mesmo periodo.
 *   DELETE  apaga.
 *
 * A previa e' POST e nao GET porque manda um corpo (a lista de conteudos, que
 * pode ser longa) e porque nao e' cacheavel: o resultado muda a cada tecla.
 */

export const dynamic = "force-dynamic";

/** Corpo comum da previa e da gravacao. */
type CorpoDoCronograma = {
  inicio?: unknown;
  fim?: unknown;
  itens?: unknown;
  excecoes?: unknown;
  periodo?: unknown;
};

/** Valida o corpo antes de gastar uma ida ate' a API. */
function lerCorpo(bruto: CorpoDoCronograma):
  | {
      ok: true;
      dados: {
        inicio: string;
        fim: string;
        itens: string[];
        excecoes: string[];
        periodo: string | null;
      };
    }
  | { ok: false; erro: string } {
  const { inicio, fim, itens, excecoes, periodo } = bruto;

  if (typeof inicio !== "string" || typeof fim !== "string") {
    return { ok: false, erro: "Informe o início e o fim do período." };
  }
  if (!Array.isArray(itens) || itens.length === 0) {
    return { ok: false, erro: "Cole pelo menos um conteúdo." };
  }

  const limpos = itens
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);

  if (limpos.length === 0) {
    return { ok: false, erro: "Cole pelo menos um conteúdo." };
  }

  return {
    ok: true,
    dados: {
      inicio,
      fim,
      itens: limpos,
      excecoes: Array.isArray(excecoes)
        ? excecoes.filter((data): data is string => typeof data === "string")
        : [],
      periodo: typeof periodo === "string" && periodo.trim() ? periodo : null,
    },
  };
}

function traduzirFalha(causa: ApiError): { mensagem: string; status: number } {
  switch (causa.status) {
    case 404:
      return { mensagem: "Turma não encontrada.", status: 404 };
    case 422:
      // O backend valida o periodo (fim antes do inicio, datas invalidas) e o
      // detalhe dele e' util pro professor — repassa em vez de generalizar.
      return {
        mensagem:
          typeof causa.detalhe === "object" &&
          causa.detalhe !== null &&
          "detail" in causa.detalhe &&
          typeof (causa.detalhe as { detail: unknown }).detail === "string"
            ? ((causa.detalhe as { detail: string }).detail as string)
            : "Período ou lista de conteúdos inválidos.",
        status: 422,
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

/** Id valido vindo da URL, ou null. */
function lerId(bruto: string): number | null {
  const id = Number(bruto);
  return Number.isInteger(id) && id > 0 ? id : null;
}

/** Previa: mostra como ficaria, sem gravar. */
export async function POST(
  requisicao: Request,
  { params }: { params: Promise<{ turmaId: string }> },
) {
  const { turmaId } = await params;
  const id = lerId(turmaId);
  if (id === null) {
    return NextResponse.json({ erro: "Turma inválida." }, { status: 422 });
  }

  const corpo = lerCorpo(await requisicao.json());
  if (!corpo.ok) {
    return NextResponse.json({ erro: corpo.erro }, { status: 422 });
  }

  try {
    return NextResponse.json(await preverCronograma(id, corpo.dados));
  } catch (causa) {
    if (causa instanceof ApiError) {
      const { mensagem, status } = traduzirFalha(causa);
      return NextResponse.json({ erro: mensagem }, { status });
    }
    throw causa;
  }
}

/** Grava o cronograma. */
export async function PUT(
  requisicao: Request,
  { params }: { params: Promise<{ turmaId: string }> },
) {
  const { turmaId } = await params;
  const id = lerId(turmaId);
  if (id === null) {
    return NextResponse.json({ erro: "Turma inválida." }, { status: 422 });
  }

  const corpo = lerCorpo(await requisicao.json());
  if (!corpo.ok) {
    return NextResponse.json({ erro: corpo.erro }, { status: 422 });
  }

  try {
    return NextResponse.json(await salvarCronograma(id, corpo.dados));
  } catch (causa) {
    if (causa instanceof ApiError) {
      const { mensagem, status } = traduzirFalha(causa);
      return NextResponse.json({ erro: mensagem }, { status });
    }
    throw causa;
  }
}

/** Apaga o cronograma do período informado na query. */
export async function DELETE(
  requisicao: Request,
  { params }: { params: Promise<{ turmaId: string }> },
) {
  const { turmaId } = await params;
  const id = lerId(turmaId);
  if (id === null) {
    return NextResponse.json({ erro: "Turma inválida." }, { status: 422 });
  }

  const url = new URL(requisicao.url);
  const inicio = url.searchParams.get("inicio");
  const fim = url.searchParams.get("fim");
  if (!inicio || !fim) {
    return NextResponse.json(
      { erro: "Informe o período a apagar." },
      { status: 422 },
    );
  }

  try {
    await excluirCronograma(id, inicio, fim);
    return new NextResponse(null, { status: 204 });
  } catch (causa) {
    if (causa instanceof ApiError) {
      const { mensagem, status } = traduzirFalha(causa);
      return NextResponse.json({ erro: mensagem }, { status });
    }
    throw causa;
  }
}
