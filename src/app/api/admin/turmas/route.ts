import { NextResponse } from "next/server";

import { statusSeguro } from "@/app/api/admin/_lib/status-seguro";
import { validarNovaTurma } from "@/app/api/admin/_lib/validar-turma";
import { ApiError, criarTurma } from "@/lib/api";

/**
 * Ponte de escrita "Nova turma" da tela "Administracao".
 *
 * O navegador chama AQUI (POST /api/admin/turmas), e esta rota, rodando no
 * servidor, repassa para a API do CUPCAM com a X-API-Key. Mesmo motivo das
 * outras pontes: "use client" nao pode importar lib/api.ts (server-only).
 */

export async function POST(requisicao: Request) {
  // Corpo esperado: NovaTurma. Qualquer outra coisa e' 400 antes de bater na API.
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
    const criada = await criarTurma(dados);
    return NextResponse.json(criada, { status: 201 });
  } catch (causa) {
    if (causa instanceof ApiError) {
      if (causa.status === 422) {
        // Erro de validacao da API (nome ou sala vazios). O detalhe vem
        // estruturado ({detail: string}) — repassa cru pro modal mostrar a
        // mensagem exata. Conflito de horario nao acontece mais aqui: a agenda
        // saiu da turma e o 409 mora em POST /admin/turmas/{id}/aulas.
        return NextResponse.json(
          { erro: "Não foi possível criar a turma.", detalhe: causa.detalhe },
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
