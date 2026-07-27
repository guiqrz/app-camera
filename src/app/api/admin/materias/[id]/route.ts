import { NextResponse } from "next/server";

import { statusSeguro } from "@/app/api/admin/_lib/status-seguro";
import { validarNovaMateria } from "@/app/api/admin/_lib/validar-materia";
import { ApiError, editarMateria, excluirMateria } from "@/lib/api";

/**
 * Ponte de "Editar materia" (PUT) e "Excluir materia" (DELETE) da tela
 * "Coordenacao". O navegador chama AQUI; esta rota, no servidor, repassa pra
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
    return NextResponse.json({ erro: "ID de matéria inválido." }, { status: 400 });
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
  if (!validarNovaMateria(dados)) {
    return NextResponse.json(
      { erro: "Dados da matéria incompletos ou inválidos." },
      { status: 400 },
    );
  }

  try {
    const resposta = await editarMateria(idNum, dados);
    return NextResponse.json(resposta);
  } catch (causa) {
    if (causa instanceof ApiError) {
      if (causa.isNotFound) {
        return NextResponse.json({ erro: "Matéria não encontrada." }, { status: 404 });
      }
      if (causa.status === 422) {
        // Validacao da API (nome vazio ou ja usado por outra materia).
        return NextResponse.json(
          { erro: "Não foi possível renomear a matéria.", detalhe: causa.detalhe },
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
    return NextResponse.json({ erro: "ID de matéria inválido." }, { status: 400 });
  }

  try {
    const resposta = await excluirMateria(idNum);
    return NextResponse.json(resposta);
  } catch (causa) {
    if (causa instanceof ApiError) {
      if (causa.isNotFound) {
        return NextResponse.json({ erro: "Matéria não encontrada." }, { status: 404 });
      }
      if (causa.status === 409) {
        // Materia em uso por alguma aula: {detail: {nome, total_aulas}} vai cru
        // pro modal dizer QUANTAS aulas usam a materia antes de bloquear.
        return NextResponse.json(
          { erro: "A matéria está em uso por aulas cadastradas.", detalhe: causa.detalhe },
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
