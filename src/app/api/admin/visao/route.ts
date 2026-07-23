import { NextResponse } from "next/server";

import { ApiError, buscarVisaoAdmin } from "@/lib/api";

/**
 * Ponte de leitura da tela "Administracao".
 *
 * O navegador chama AQUI (GET /api/admin/visao), e esta rota, rodando no
 * servidor, repassa para a API do CUPCAM com a X-API-Key. Componentes
 * "use client" nao podem importar lib/api.ts (server-only), entao a chave
 * nunca aparece no JavaScript do usuario.
 */

export async function GET() {
  try {
    const visao = await buscarVisaoAdmin();
    return NextResponse.json(visao);
  } catch (causa) {
    if (causa instanceof ApiError) {
      return NextResponse.json(
        { erro: "Não foi possível falar com a API do CUPCAM." },
        { status: causa.status === 0 ? 502 : causa.status },
      );
    }
    throw causa;
  }
}
