import { NextResponse } from "next/server";

import { statusSeguro } from "@/app/api/admin/_lib/status-seguro";
import { ApiError, buscarAulasDaTurma, listarTurmas } from "@/lib/api";

/**
 * Ponte do seletor de aula do Cup AI.
 *
 * Sem `?turma`, devolve as turmas (pra preencher o primeiro dropdown). Com
 * `?turma={id}`, devolve as aulas JA' DADAS daquela turma — sessoes reais, nao
 * a grade horaria, porque so' aula que aconteceu pode ter transcricao.
 *
 * Duas respostas na mesma rota de proposito: e' um seletor so', em dois passos,
 * e o navegador nao pode importar lib/api.ts (server-only) pra chamar direto.
 */

export const dynamic = "force-dynamic";

export async function GET(requisicao: Request) {
  const turmaBruta = new URL(requisicao.url).searchParams.get("turma");

  try {
    if (turmaBruta === null) {
      return NextResponse.json(await listarTurmas());
    }

    const turmaId = Number(turmaBruta);
    if (!Number.isInteger(turmaId) || turmaId <= 0) {
      return NextResponse.json({ erro: "Turma inválida." }, { status: 422 });
    }

    return NextResponse.json(await buscarAulasDaTurma(turmaId));
  } catch (causa) {
    if (causa instanceof ApiError) {
      return NextResponse.json(
        {
          erro: "Não foi possível carregar as aulas. Verifique se o notebook da sala está ligado.",
        },
        { status: statusSeguro(causa) },
      );
    }
    throw causa;
  }
}
