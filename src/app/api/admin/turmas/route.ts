import { NextResponse } from "next/server";

import { ApiError, criarTurma } from "@/lib/api";
import type { NovaTurma } from "@/lib/types";

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
        // Erro de validacao da API (ex.: horario invalido, sala ocupada).
        // O detalhe vem estruturado ({detail: string}) — repassa cru pro
        // modal mostrar a mensagem exata.
        return NextResponse.json(
          { erro: "Não foi possível criar a turma.", detalhe: causa.detalhe },
          { status: 422 },
        );
      }
      return NextResponse.json(
        { erro: "Não foi possível falar com a API do CUPCAM." },
        { status: causa.status === 0 ? 502 : causa.status },
      );
    }
    throw causa;
  }
}

function validarNovaTurma(dados: unknown): dados is NovaTurma {
  if (typeof dados !== "object" || dados === null) return false;
  const d = dados as Record<string, unknown>;
  return (
    typeof d.nome === "string" &&
    d.nome.trim() !== "" &&
    typeof d.sala_id === "string" &&
    d.sala_id.trim() !== "" &&
    typeof d.dia_semana === "number" &&
    Number.isInteger(d.dia_semana) &&
    d.dia_semana >= 0 &&
    d.dia_semana <= 6 &&
    typeof d.hora_inicio === "string" &&
    d.hora_inicio.trim() !== "" &&
    typeof d.hora_fim === "string" &&
    d.hora_fim.trim() !== ""
  );
}
