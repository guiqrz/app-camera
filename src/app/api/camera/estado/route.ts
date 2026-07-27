import { NextResponse } from "next/server";

import { statusSeguro } from "@/app/api/admin/_lib/status-seguro";
import { ApiError, lerEstadoCamera } from "@/lib/api";

/**
 * Ponte de leitura da tela "Camera".
 *
 * O navegador chama AQUI (GET /api/camera/estado), e esta rota, rodando no
 * servidor, repassa para a API do CUPCAM com a X-API-Key. Componentes
 * "use client" nao podem importar lib/api.ts (server-only), entao a chave
 * nunca aparece no JavaScript do usuario.
 */

// Forca a rota a rodar por requisicao. A leitura ja e' "ao vivo" na pratica
// (lerEstadoCamera usa revalidate: 0 em lib/api.ts), mas isso fica dois
// arquivos de distancia — explicitar aqui imuniza contra um refactor futuro
// que mude o cache de lib/api.ts sem perceber que esta rota dependia disso.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await lerEstadoCamera());
  } catch (causa) {
    if (causa instanceof ApiError) {
      return NextResponse.json(
        { erro: "Não foi possível falar com a câmera. Tente novamente em instantes." },
        { status: statusSeguro(causa) },
      );
    }
    throw causa;
  }
}
