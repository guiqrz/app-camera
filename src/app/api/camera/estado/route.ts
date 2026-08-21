import { NextResponse } from "next/server";

import { statusSeguro } from "@/app/api/admin/_lib/status-seguro";
import { ApiError, ConfiguracaoAusenteError, lerEstadoCamera } from "@/lib/api";

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
    // Configuracao faltando na Vercel: quem resolve e' quem administra o site,
    // nao o professor. 503 com a mesma marca de offline (a tela nao tem o que
    // fazer de diferente), mas mensagem propria.
    if (causa instanceof ConfiguracaoAusenteError) {
      return NextResponse.json(
        {
          erro: "O endereço do computador da sala não está configurado no site.",
          cameraOffline: true,
        },
        { status: 503 },
      );
    }
    if (causa instanceof ApiError) {
      // O computador da sala nao respondeu — desligado, ou sem o tunel aberto.
      // NAO e' falha: fora do horario de aula e' o estado normal, e o resto do
      // site continua funcionando porque vem da nuvem. A tela precisa saber
      // distinguir isso de "camera parada" pra explicar ao professor por que o
      // botao Ligar nao vai adiantar. 503 e' o status honesto: o servico existe
      // e esta temporariamente fora, diferente do 502 de infraestrutura quebrada.
      if (causa.isCameraOffline) {
        return NextResponse.json(
          {
            erro: "O computador da sala não está conectado.",
            cameraOffline: true,
          },
          { status: 503 },
        );
      }
      return NextResponse.json(
        { erro: "Não foi possível falar com a câmera. Tente novamente em instantes." },
        { status: statusSeguro(causa) },
      );
    }
    throw causa;
  }
}
