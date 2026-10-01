import { NextResponse } from "next/server";

import { statusSeguro } from "@/app/api/admin/_lib/status-seguro";
import { ApiError, lerPlanoDeAula } from "@/lib/api";

/**
 * Ponte de leitura de um plano de aula do Cup AI.
 *
 * Como as outras pontes, roda no servidor e repassa a X-API-Key pra API do
 * CUPCAM — a chave nunca chega ao JavaScript do navegador.
 */

export const dynamic = "force-dynamic";

export async function GET(
  _requisicao: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: bruto } = await params;
  const id = Number(bruto);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ erro: "Plano inválido." }, { status: 422 });
  }

  try {
    return NextResponse.json(await lerPlanoDeAula(id));
  } catch (causa) {
    if (causa instanceof ApiError) {
      const mensagem = causa.isNotFound
        ? "Este plano de aula não existe mais."
        : "Não foi possível carregar o plano. Tente de novo em instantes.";
      return NextResponse.json({ erro: mensagem }, { status: statusSeguro(causa) });
    }
    throw causa;
  }
}
