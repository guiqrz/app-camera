import { NextResponse } from "next/server";

import { statusSeguro } from "@/app/api/admin/_lib/status-seguro";
import { ApiError, buscarTranscricao } from "@/lib/api";

/**
 * Ponte de leitura da transcricao de uma aula.
 *
 * O navegador chama AQUI, e esta rota, rodando no servidor, repassa para a API
 * do CUPCAM com a X-API-Key. "use client" nao pode importar lib/api.ts
 * (server-only), entao a chave nunca aparece no JavaScript do usuario.
 */

export const dynamic = "force-dynamic";

export async function GET(
  _requisicao: Request,
  { params }: { params: Promise<{ sessaoId: string }> },
) {
  const { sessaoId } = await params;
  const id = Number(sessaoId);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ erro: "Sessão inválida." }, { status: 422 });
  }

  try {
    return NextResponse.json(await buscarTranscricao(id));
  } catch (causa) {
    if (causa instanceof ApiError) {
      // 404 aqui e' NORMAL: a aula simplesmente nao gravou audio. Quem chama
      // trata como "sem transcricao", nao como erro.
      return NextResponse.json(
        { erro: "Esta aula não tem transcrição." },
        { status: statusSeguro(causa) },
      );
    }
    throw causa;
  }
}
