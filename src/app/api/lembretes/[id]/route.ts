import { NextResponse } from "next/server";

import { statusSeguro } from "@/app/api/admin/_lib/status-seguro";
import { ApiError, editarLembrete, removerLembrete } from "@/lib/api";
import type { LembreteEditado } from "@/lib/types";

type Props = { params: Promise<{ id: string }> };

async function lerId(params: Props["params"]) {
  const { id } = await params;
  const numero = Number(id);
  return Number.isInteger(numero) && numero > 0 ? numero : null;
}

/**
 * Ponte de edicao e exclusao de um lembrete.
 *
 * PATCH e nao PUT porque a acao dominante da tela e' marcar como feito, que
 * manda um campo so'.
 */
export async function PATCH(requisicao: Request, { params }: Props) {
  const id = await lerId(params);
  if (id === null) {
    return NextResponse.json({ erro: "Lembrete inválido." }, { status: 400 });
  }

  let corpo: unknown;
  try {
    corpo = await requisicao.json();
  } catch {
    return NextResponse.json(
      { erro: "Corpo da requisição inválido." },
      { status: 400 },
    );
  }

  const recebido = (corpo ?? {}) as Record<string, unknown>;

  // Monta o corpo campo a campo, incluindo APENAS o que veio de fato.
  //
  // O `in` e' o ponto todo desta rota: `data` ausente e `data: null` significam
  // coisas OPOSTAS no backend (manter o prazo vs. apaga-lo), e os dois viram
  // `undefined` numa leitura ingenua. Um `data: recebido.data ?? null` aqui
  // apagaria o prazo de todo lembrete que o professor marcasse como feito.
  const paraEnviar: LembreteEditado = {};
  if ("texto" in recebido) {
    if (typeof recebido.texto !== "string" || !recebido.texto.trim()) {
      return NextResponse.json(
        { erro: "O lembrete não pode ficar sem texto." },
        { status: 422 },
      );
    }
    paraEnviar.texto = recebido.texto;
  }
  if ("data" in recebido) {
    const data = recebido.data;
    paraEnviar.data = typeof data === "string" && data ? data : null;
  }
  if ("feito" in recebido) {
    paraEnviar.feito = Boolean(recebido.feito);
  }

  try {
    return NextResponse.json(await editarLembrete(id, paraEnviar));
  } catch (causa) {
    if (causa instanceof ApiError) {
      if (causa.isNotFound) {
        return NextResponse.json(
          { erro: "Lembrete não encontrado." },
          { status: 404 },
        );
      }
      if (causa.status === 422) {
        return NextResponse.json(
          { erro: "Lembrete inválido.", detalhe: causa.detalhe },
          { status: 422 },
        );
      }
      return NextResponse.json(
        { erro: "Não foi possível salvar o lembrete." },
        { status: statusSeguro(causa) },
      );
    }
    throw causa;
  }
}

export async function DELETE(_requisicao: Request, { params }: Props) {
  const id = await lerId(params);
  if (id === null) {
    return NextResponse.json({ erro: "Lembrete inválido." }, { status: 400 });
  }

  try {
    return NextResponse.json(await removerLembrete(id));
  } catch (causa) {
    if (causa instanceof ApiError) {
      if (causa.isNotFound) {
        return NextResponse.json(
          { erro: "Lembrete não encontrado." },
          { status: 404 },
        );
      }
      return NextResponse.json(
        { erro: "Não foi possível apagar o lembrete." },
        { status: statusSeguro(causa) },
      );
    }
    throw causa;
  }
}
