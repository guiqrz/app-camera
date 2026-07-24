import { NextResponse } from "next/server";

import { statusSeguro } from "@/app/api/admin/_lib/status-seguro";
import { validarNovaTurma } from "@/app/api/admin/_lib/validar-turma";
import { ApiError, editarTurma, excluirTurma } from "@/lib/api";

/**
 * Ponte de "Editar turma" (PUT) e "Excluir turma" (DELETE) da tela
 * "Administracao". O navegador chama AQUI; esta rota, no servidor, repassa pra
 * API do CUPCAM com a X-API-Key. Mesmo motivo das outras pontes: "use client"
 * nao pode importar lib/api.ts (server-only).
 */
type Params = { params: Promise<{ id: string }> };

function idValido(bruto: string): number | null {
  const n = Number(bruto);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export async function PUT(requisicao: Request, { params }: Params) {
  const { id } = await params;
  const idNum = idValido(id);
  if (idNum === null) {
    return NextResponse.json({ erro: "ID de turma inválido." }, { status: 400 });
  }

  let dados: unknown;
  try {
    dados = await requisicao.json();
  } catch {
    return NextResponse.json(
      { erro: "Corpo da requisição inválido." },
      { status: 400 },
    );
  }
  if (!validarNovaTurma(dados)) {
    return NextResponse.json(
      { erro: "Dados da turma incompletos ou inválidos." },
      { status: 400 },
    );
  }

  try {
    const resposta = await editarTurma(idNum, dados);
    return NextResponse.json(resposta);
  } catch (causa) {
    if (causa instanceof ApiError) {
      if (causa.isNotFound) {
        return NextResponse.json({ erro: "Turma não encontrada." }, { status: 404 });
      }
      if (causa.status === 409) {
        // Conflito de horario: {detail: {nome}} vai cru pro modal exibir com
        // qual turma o novo horario colide.
        return NextResponse.json(
          { erro: "Conflito de horário com outra turma.", detalhe: causa.detalhe },
          { status: 409 },
        );
      }
      if (causa.status === 422) {
        // Validacao de horario (formato, fim antes do inicio).
        return NextResponse.json(
          { erro: "Não foi possível editar a turma.", detalhe: causa.detalhe },
          { status: 422 },
        );
      }
      return NextResponse.json(
        { erro: "Não foi possível falar com a API do CUPCAM. Tente novamente em instantes." },
        { status: statusSeguro(causa) },
      );
    }
    throw causa;
  }
}

export async function DELETE(_requisicao: Request, { params }: Params) {
  const { id } = await params;
  const idNum = idValido(id);
  if (idNum === null) {
    return NextResponse.json({ erro: "ID de turma inválido." }, { status: 400 });
  }

  try {
    const resposta = await excluirTurma(idNum);
    return NextResponse.json(resposta);
  } catch (causa) {
    if (causa instanceof ApiError) {
      if (causa.isNotFound) {
        return NextResponse.json({ erro: "Turma não encontrada." }, { status: 404 });
      }
      if (causa.status === 409) {
        // Exclusao recusada: {detail: {motivo, nome, total_*}} vai cru pro modal
        // entrar no estado bloqueado. O motivo ("alunos" ou "historico") decide a
        // mensagem la', entao aqui o texto fica neutro.
        return NextResponse.json(
          { erro: "Não foi possível excluir a turma.", detalhe: causa.detalhe },
          { status: 409 },
        );
      }
      return NextResponse.json(
        { erro: "Não foi possível falar com a API do CUPCAM. Tente novamente em instantes." },
        { status: statusSeguro(causa) },
      );
    }
    throw causa;
  }
}
