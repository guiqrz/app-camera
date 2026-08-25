import { NextResponse } from "next/server";

import {
  ApiError,
  gerarBoletimDaFamilia,
  gerarRascunhoDoConselho,
} from "@/lib/api";

/**
 * Ponte dos relatorios de fim de periodo: conselho (F2) e boletim (F3).
 *
 * Existe pelo mesmo motivo das outras pontes: a chave da API do CUPCAM fica no
 * servidor e nunca chega ao navegador (ver o cabecalho de lib/api.ts).
 *
 * As duas features moram na MESMA ponte porque sao o mesmo motor com outro
 * recorte: o conselho leva frequencia da turma, o boletim da familia nao leva
 * nenhum dado de aluno — nem agregado. O `tipo` no corpo escolhe qual.
 *
 * POST e nao GET porque GASTA chamada de IA: um GET seria cacheado,
 * pre-carregado pelo navegador e repetido a cada F5, cada um custando dinheiro
 * e devolvendo um texto ligeiramente diferente do que o professor acabou de
 * ler.
 *
 * NENHUMA das duas grava ou envia nada. O texto volta pro professor ler,
 * corrigir e usar — o documento vai ser assinado por ele.
 */

export const dynamic = "force-dynamic";

function traduzirFalha(causa: ApiError): { mensagem: string; status: number } {
  switch (causa.status) {
    case 404:
      return { mensagem: "Turma não encontrada.", status: 404 };
    case 502:
      // A API respondeu, mas o modelo falhou ou nao havia material. O detalhe
      // do backend e' util aqui: ele distingue "sem conteudo registrado no
      // periodo" de "a IA falhou", e as duas pedem coisas diferentes do
      // professor.
      return {
        mensagem:
          typeof causa.detalhe === "object" &&
          causa.detalhe !== null &&
          "detail" in causa.detalhe &&
          typeof (causa.detalhe as { detail: unknown }).detail === "string"
            ? ((causa.detalhe as { detail: string }).detail as string)
            : "Não foi possível gerar o texto agora. Tente de novo em instantes.",
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
  { params }: { params: Promise<{ turmaId: string }> },
) {
  const { turmaId } = await params;
  const id = Number(turmaId);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ erro: "Turma inválida." }, { status: 422 });
  }

  const corpo = (await requisicao.json()) as {
    tipo?: unknown;
    inicio?: unknown;
    fim?: unknown;
    periodo?: unknown;
  };

  if (corpo.tipo !== "conselho" && corpo.tipo !== "boletim") {
    return NextResponse.json(
      { erro: "Escolha entre o rascunho do conselho e o boletim." },
      { status: 422 },
    );
  }
  if (typeof corpo.inicio !== "string" || typeof corpo.fim !== "string") {
    return NextResponse.json(
      { erro: "Informe o início e o fim do período." },
      { status: 422 },
    );
  }

  const periodo = {
    inicio: corpo.inicio,
    fim: corpo.fim,
    periodo:
      typeof corpo.periodo === "string" && corpo.periodo.trim()
        ? corpo.periodo
        : null,
  };

  try {
    const texto =
      corpo.tipo === "conselho"
        ? await gerarRascunhoDoConselho(id, periodo)
        : await gerarBoletimDaFamilia(id, periodo);
    return NextResponse.json(texto);
  } catch (causa) {
    if (causa instanceof ApiError) {
      const { mensagem, status } = traduzirFalha(causa);
      return NextResponse.json({ erro: mensagem }, { status });
    }
    throw causa;
  }
}
