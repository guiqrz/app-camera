import { NextResponse } from "next/server";

import { ApiError, buscarChamada } from "@/lib/api";

/**
 * Ponte de leitura da chamada ao vivo.
 *
 * Enquanto a aula esta em andamento, a vista da chamada consulta AQUI a cada
 * poucos segundos para trazer as deteccoes novas da camera. Mesmo motivo da
 * rota de escrita: o navegador nao pode falar com a API do CUPCAM direto,
 * senao a X-API-Key vazaria.
 */

type Params = {
  params: Promise<{ sessaoId: string }>;
};

export async function GET(_requisicao: Request, { params }: Params) {
  const { sessaoId } = await params;

  const id = Number(sessaoId);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ erro: "Sessão inválida." }, { status: 400 });
  }

  try {
    const chamada = await buscarChamada(id);
    return NextResponse.json(chamada);
  } catch (causa) {
    if (causa instanceof ApiError) {
      if (causa.isNotFound) {
        return NextResponse.json(
          { erro: "Aula não encontrada." },
          { status: 404 },
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
