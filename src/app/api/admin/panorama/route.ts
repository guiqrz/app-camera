import { NextResponse } from "next/server";

import { statusSeguro } from "@/app/api/admin/_lib/status-seguro";
import { ApiError, buscarPanoramaCoordenacao } from "@/lib/api";

/**
 * Ponte de leitura do panorama da tela "Coordenacao".
 *
 * Mesma mecanica de /api/admin/visao: o navegador chama aqui e esta rota,
 * rodando no servidor, repassa para a API do CUPCAM com a X-API-Key —
 * componentes "use client" nao podem importar lib/api.ts (server-only).
 *
 * Existe separada da visao porque as duas tem naturezas diferentes: a visao
 * carrega o cadastro editavel (com RA e nome), o panorama e' agregado e nao
 * expoe aluno nenhum. A tela usa as duas, e a de recarregar depois de uma
 * mutacao chama as duas em paralelo.
 */

// Mesmo motivo do /api/admin/visao: buscarPanoramaCoordenacao ja usa
// revalidate: 0, mas isso fica dois arquivos de distancia — explicitar aqui
// imuniza contra um refactor futuro no cache de lib/api.ts.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const panorama = await buscarPanoramaCoordenacao();
    return NextResponse.json(panorama);
  } catch (causa) {
    if (causa instanceof ApiError) {
      return NextResponse.json(
        { erro: "Não foi possível falar com a API do CUPCAM. Tente novamente em instantes." },
        { status: statusSeguro(causa) },
      );
    }
    throw causa;
  }
}
