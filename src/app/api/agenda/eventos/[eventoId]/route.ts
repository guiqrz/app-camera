import { NextResponse } from "next/server";

import {
  lerCorpoDoEvento,
  traduzirFalhaDaAgenda,
} from "@/app/api/agenda/eventos/route";
import { ApiError, apagarEventoDaAgenda, editarEventoDaAgenda } from "@/lib/api";

/**
 * Ponte da edicao e da exclusao de um evento da agenda.
 *
 * A leitura do corpo e a traducao do erro vem da rota irma (../route.ts): as
 * duas aceitam exatamente o mesmo corpo, e duplicar a checagem faria uma delas
 * envelhecer sozinha quando um campo mudasse.
 */

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ eventoId: string }> };

function lerId(bruto: string) {
  const id = Number(bruto);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function PUT(requisicao: Request, { params }: Props) {
  const { eventoId } = await params;
  const id = lerId(eventoId);
  if (id === null) {
    return NextResponse.json({ erro: "Evento inválido." }, { status: 400 });
  }

  let bruto: unknown;
  try {
    bruto = await requisicao.json();
  } catch {
    return NextResponse.json(
      { erro: "Corpo da requisição inválido." },
      { status: 400 },
    );
  }

  const lido = lerCorpoDoEvento((bruto ?? {}) as Record<string, unknown>);
  if ("erro" in lido) {
    return NextResponse.json({ erro: lido.erro }, { status: 422 });
  }

  try {
    return NextResponse.json(await editarEventoDaAgenda(id, lido.evento));
  } catch (causa) {
    if (causa instanceof ApiError) {
      const { mensagem, status } = traduzirFalhaDaAgenda(causa);
      return NextResponse.json({ erro: mensagem }, { status });
    }
    throw causa;
  }
}

export async function DELETE(_requisicao: Request, { params }: Props) {
  const { eventoId } = await params;
  const id = lerId(eventoId);
  if (id === null) {
    return NextResponse.json({ erro: "Evento inválido." }, { status: 400 });
  }

  try {
    return NextResponse.json(await apagarEventoDaAgenda(id));
  } catch (causa) {
    if (causa instanceof ApiError) {
      const { mensagem, status } = traduzirFalhaDaAgenda(causa);
      return NextResponse.json({ erro: mensagem }, { status });
    }
    throw causa;
  }
}
