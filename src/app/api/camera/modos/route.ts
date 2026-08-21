import { NextResponse } from "next/server";

import { statusSeguro } from "@/app/api/admin/_lib/status-seguro";
import { ApiError, ConfiguracaoAusenteError, listarModosCamera } from "@/lib/api";

/**
 * Ponte de leitura "modos disponiveis" da tela "Camera".
 *
 * O navegador chama AQUI (GET /api/camera/modos), e esta rota, rodando no
 * servidor, repassa para a API do CUPCAM com a X-API-Key. "use client" nao
 * pode importar lib/api.ts (server-only), entao a chave nunca aparece no
 * JavaScript do usuario.
 *
 * Os rotulos e resumos vem do backend pra descricao e comportamento nunca
 * divergirem. Se esta rota falhar, a tela usa MODOS_CAMERA_FALLBACK e o
 * professor continua com os botoes — perder a conexao nao pode custar o
 * controle da camera.
 */

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await listarModosCamera());
  } catch (causa) {
    // Notebook fora do ar ou variavel faltando: a tela ja tem
    // MODOS_CAMERA_FALLBACK e segue com a lista embutida, entao aqui basta nao
    // deixar a excecao subir. Sem mensagem propria — quem explica o notebook
    // desligado e' /api/camera/estado, e dois avisos pro mesmo fato so'
    // poluiriam a tela.
    if (causa instanceof ConfiguracaoAusenteError) {
      return NextResponse.json(
        { erro: "Não foi possível carregar os modos da câmera." },
        { status: 503 },
      );
    }
    if (causa instanceof ApiError) {
      return NextResponse.json(
        { erro: "Não foi possível carregar os modos da câmera." },
        { status: statusSeguro(causa) },
      );
    }
    throw causa;
  }
}
