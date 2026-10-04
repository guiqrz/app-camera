import { NextResponse } from "next/server";

import { statusSeguro } from "@/app/api/admin/_lib/status-seguro";
import { ApiError, buscarAgendaCoordenacao } from "@/lib/api";

/**
 * Ponte da agenda da coordenacao (papeis, 03/10/2026): a grade da escola com
 * filtro opcional por professor e por turma (?professor_id=&turma_id=).
 */
export const dynamic = "force-dynamic";

/** Id positivo da query, undefined sem filtro, null se veio lixo. */
function filtro(bruto: string | null): number | undefined | null {
  if (bruto === null || bruto === "") return undefined;
  const n = Number(bruto);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export async function GET(requisicao: Request) {
  const consulta = new URL(requisicao.url).searchParams;
  const professorId = filtro(consulta.get("professor_id"));
  const turmaId = filtro(consulta.get("turma_id"));
  if (professorId === null || turmaId === null) {
    return NextResponse.json({ erro: "Filtro inválido." }, { status: 400 });
  }

  try {
    return NextResponse.json(await buscarAgendaCoordenacao({ professorId, turmaId }));
  } catch (causa) {
    if (causa instanceof ApiError) {
      return NextResponse.json(
        { erro: "Não foi possível carregar a agenda. Tente novamente em instantes." },
        { status: statusSeguro(causa) },
      );
    }
    throw causa;
  }
}
