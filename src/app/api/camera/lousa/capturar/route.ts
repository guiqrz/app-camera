import { NextResponse } from "next/server";

import {
  mensagemDeCameraOffline,
  statusSeguro,
} from "@/app/api/admin/_lib/status-seguro";
import { ApiError, ConfiguracaoAusenteError, capturarLousa } from "@/lib/api";

/**
 * Ponte do botao "Capturar quadro" (e do "Ler de novo") da tela "Camera".
 *
 * O navegador chama AQUI, e esta rota, rodando no servidor, repassa pra API do
 * CUPCAM com a X-API-Key. "use client" nao pode importar lib/api.ts
 * (server-only), entao a chave nunca aparece no JavaScript do usuario.
 *
 * Sem corpo: a captura nao tem parametro nenhum — e' sempre "o quadro, agora".
 */

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    return NextResponse.json(await capturarLousa(), { status: 202 });
  } catch (causa) {
    if (causa instanceof ConfiguracaoAusenteError) {
      return NextResponse.json(
        { erro: "O endereço do computador da sala não está configurado no site." },
        { status: 503 },
      );
    }
    if (causa instanceof ApiError) {
      // 409 e' resposta esperada, nao falha: a camera esta parada ou fora do
      // modo Lousa. O motivo vem do backend porque so' ele sabe qual dos dois
      // — e o professor precisa saber o que fazer pra destravar.
      //
      // Le de `detalhe` (o {detail} ja parseado) e nao de `message`, que traz
      // o texto tecnico "API respondeu 409 em /rota. {...}" na frente.
      if (causa.status === 409) {
        const corpo = causa.detalhe as { detail?: string } | undefined;
        return NextResponse.json(
          { erro: corpo?.detail || "A câmera precisa estar no modo Lousa." },
          { status: 409 },
        );
      }
      return NextResponse.json(
        {
          erro:
            mensagemDeCameraOffline(causa) ??
            "Não foi possível capturar o quadro.",
        },
        { status: statusSeguro(causa) },
      );
    }
    throw causa;
  }
}
