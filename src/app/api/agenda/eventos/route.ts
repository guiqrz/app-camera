import { NextResponse } from "next/server";

import { ApiError, criarEventoDaAgenda } from "@/lib/api";
import type { NovoEventoDaAgenda, TipoDeEvento } from "@/lib/types";

/**
 * Ponte da criacao de evento da agenda.
 *
 * Existe pelo mesmo motivo das outras pontes: a chave da API do CUPCAM fica no
 * servidor e nunca chega ao navegador (ver o cabecalho de lib/api.ts).
 *
 * A validacao de verdade — tipo conhecido, data no formato, coerencia entre
 * turma e aula — mora no backend (gestao/agenda.py). Aqui so' se checa a FORMA
 * do corpo, pra devolver um erro claro antes de gastar uma viagem de rede.
 */

export const dynamic = "force-dynamic";

const TIPOS: TipoDeEvento[] = ["nota", "prova", "cancelada", "extra"];

/** "AAAA-MM-DD" e nada mais. Igual a' validacao do backend. */
const FORMATO_DA_DATA = /^\d{4}-\d{2}-\d{2}$/;

type CorpoBruto = {
  data?: unknown;
  tipo?: unknown;
  titulo?: unknown;
  descricao?: unknown;
  turma_id?: unknown;
  aula_id?: unknown;
};

/**
 * Valida a forma do corpo e devolve o evento pronto, ou a mensagem do erro.
 *
 * Compartilhada com o PUT (ver ../[eventoId]/route.ts): as duas rotas aceitam
 * exatamente o mesmo corpo, e duplicar a checagem faria uma delas envelhecer
 * sozinha quando um campo mudasse.
 */
export function lerCorpoDoEvento(
  bruto: CorpoBruto,
): { evento: NovoEventoDaAgenda } | { erro: string } {
  const { data, tipo, titulo, descricao, turma_id, aula_id } = bruto;

  if (typeof data !== "string" || !FORMATO_DA_DATA.test(data)) {
    return { erro: "Informe a data no formato AAAA-MM-DD." };
  }
  if (typeof tipo !== "string" || !TIPOS.includes(tipo as TipoDeEvento)) {
    return { erro: "Tipo de evento desconhecido." };
  }
  if (typeof titulo !== "string" || !titulo.trim()) {
    return { erro: "O título é obrigatório." };
  }
  if (descricao !== undefined && typeof descricao !== "string") {
    return { erro: "Descrição inválida." };
  }

  // null e' legitimo nos dois: turma_id null = evento pessoal, aula_id null =
  // o evento fala do dia, nao de uma aula.
  for (const [nome, valor] of [
    ["turma_id", turma_id],
    ["aula_id", aula_id],
  ] as const) {
    if (valor !== undefined && valor !== null) {
      if (!Number.isInteger(valor) || (valor as number) <= 0) {
        return { erro: `Valor inválido em ${nome}.` };
      }
    }
  }

  return {
    evento: {
      data,
      tipo: tipo as TipoDeEvento,
      titulo: titulo.trim(),
      descricao: typeof descricao === "string" ? descricao : "",
      turma_id: (turma_id as number | null | undefined) ?? null,
      aula_id: (aula_id as number | null | undefined) ?? null,
    },
  };
}

/** Traduz a falha do backend numa mensagem que o formulario mostra. */
export function traduzirFalhaDaAgenda(causa: ApiError): {
  mensagem: string;
  status: number;
} {
  if (causa.status === 422) {
    // O detail do backend distingue "aula nao e' da turma" de "tipo exige
    // aula" — mensagens diferentes que pedem coisas diferentes do professor.
    const detalhe = causa.detalhe;
    const texto =
      typeof detalhe === "object" &&
      detalhe !== null &&
      "detail" in detalhe &&
      typeof (detalhe as { detail: unknown }).detail === "string"
        ? (detalhe as { detail: string }).detail
        : "Não foi possível salvar o evento.";
    return { mensagem: texto, status: 422 };
  }
  if (causa.isNotFound) {
    return { mensagem: "Evento não encontrado.", status: 404 };
  }
  // 504 e nao 502: a requisicao nao chegou na API do CUPCAM. Mesma distincao
  // das outras pontes.
  return {
    mensagem: "Não foi possível falar com a API do CUPCAM.",
    status: 504,
  };
}

export async function POST(requisicao: Request) {
  let bruto: unknown;
  try {
    bruto = await requisicao.json();
  } catch {
    return NextResponse.json(
      { erro: "Corpo da requisição inválido." },
      { status: 400 },
    );
  }

  const lido = lerCorpoDoEvento((bruto ?? {}) as CorpoBruto);
  if ("erro" in lido) {
    return NextResponse.json({ erro: lido.erro }, { status: 422 });
  }

  try {
    return NextResponse.json(await criarEventoDaAgenda(lido.evento), {
      status: 201,
    });
  } catch (causa) {
    if (causa instanceof ApiError) {
      const { mensagem, status } = traduzirFalhaDaAgenda(causa);
      return NextResponse.json({ erro: mensagem }, { status });
    }
    throw causa;
  }
}
