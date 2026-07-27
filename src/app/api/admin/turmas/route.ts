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
      if (causa.status === 409) {
        // Conflito de horario: outra turma ja ocupa a mesma sala/dia nesse
        // intervalo. O detalhe ({detail: {nome}}) vai cru pro modal apontar
        // com qual turma o horario colide.
        return NextResponse.json(
          { erro: "Conflito de horário com outra turma.", detalhe: causa.detalhe },
          { status: 409 },
        );
      }
      if (causa.status === 422) {
        // Erro de validacao da API (ex.: horario invalido, fim antes do inicio).
        // O detalhe vem estruturado ({detail: string}) — repassa cru pro
        // modal mostrar a mensagem exata.
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
