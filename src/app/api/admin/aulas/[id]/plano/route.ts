import { NextResponse } from "next/server";

import { statusSeguro } from "@/app/api/admin/_lib/status-seguro";
import { ApiError, definirPlanoDaAula } from "@/lib/api";

type Props = { params: Promise<{ id: string }> };

/** Teto do plano — espelha o max_length do model PlanoDaAula no backend. */
const MAXIMO_CARACTERES = 200;

/**
 * Ponte do plano da aula (o texto que o professor escreve pra si mesmo na
 * agenda). Texto vazio LIMPA o plano — nao ha DELETE separado.
 */
export async function PUT(requisicao: Request, { params }: Props) {
  const { id } = await params;
  const aulaId = Number(id);
  if (!Number.isInteger(aulaId) || aulaId <= 0) {
    return NextResponse.json({ erro: "Aula inválida." }, { status: 400 });
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

  const { texto } = (corpo ?? {}) as { texto?: unknown };
  if (typeof texto !== "string") {
    return NextResponse.json(
      { erro: "Plano inválido." },
      { status: 422 },
    );
  }
  if (texto.length > MAXIMO_CARACTERES) {
    return NextResponse.json(
      { erro: `O plano deve ter no máximo ${MAXIMO_CARACTERES} caracteres.` },
      { status: 422 },
    );
  }

  try {
    return NextResponse.json(await definirPlanoDaAula(aulaId, texto));
  } catch (causa) {
    if (causa instanceof ApiError) {
      if (causa.isNotFound) {
        return NextResponse.json(
          { erro: "Aula não encontrada." },
          { status: 404 },
        );
      }
      return NextResponse.json(
        { erro: "Não foi possível salvar o plano." },
        { status: statusSeguro(causa) },
      );
    }
    throw causa;
  }
}
