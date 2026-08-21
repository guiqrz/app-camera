import { NextResponse } from "next/server";

import {
  mensagemDeCameraOffline,
  statusSeguro,
} from "@/app/api/admin/_lib/status-seguro";
import {
  ApiError,
  ConfiguracaoAusenteError,
  lerAudioCamera,
  trocarAudioCamera,
} from "@/lib/api";

/**
 * Ponte "microfone da aula" da tela "Camera".
 *
 * O navegador chama AQUI, e esta rota, rodando no servidor, repassa para a API
 * do CUPCAM com a X-API-Key. "use client" nao pode importar lib/api.ts
 * (server-only), entao a chave nunca aparece no JavaScript do usuario.
 *
 * GET  -> {"ativo": bool}  — comando pendente
 * POST -> {"ativo": bool}  — liga/desliga; corpo: {"ativo": true|false}
 */

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await lerAudioCamera());
  } catch (causa) {
    // Backend fora nao pode virar "gravando" na tela: em caso de duvida a
    // resposta segura e' DESLIGADO. Mostrar o aviso de gravacao por causa de
    // um erro de rede seria mentir sobre o que esta acontecendo na sala — vale
    // igual pro notebook desconectado e pra variavel faltando.
    if (causa instanceof ConfiguracaoAusenteError) {
      return NextResponse.json({ ativo: false }, { status: 503 });
    }
    if (causa instanceof ApiError) {
      return NextResponse.json({ ativo: false }, { status: statusSeguro(causa) });
    }
    throw causa;
  }
}

/** `ativo` booleano do corpo, ou null se ausente/de outro tipo. */
async function lerAtivo(requisicao: Request): Promise<boolean | null> {
  try {
    const corpo = (await requisicao.json()) as { ativo?: unknown };
    return typeof corpo?.ativo === "boolean" ? corpo.ativo : null;
  } catch {
    return null;
  }
}

export async function POST(requisicao: Request) {
  const ativo = await lerAtivo(requisicao);
  if (ativo === null) {
    // Sem default: um corpo invalido nao pode virar "ligar o microfone" em
    // silencio. Gravar audio de uma sala precisa de pedido explicito.
    return NextResponse.json(
      { erro: "Informe se o microfone deve ficar ligado ou desligado." },
      { status: 422 },
    );
  }

  try {
    return NextResponse.json(await trocarAudioCamera(ativo));
  } catch (causa) {
    if (causa instanceof ConfiguracaoAusenteError) {
      return NextResponse.json(
        { erro: "O endereço do computador da sala não está configurado no site." },
        { status: 503 },
      );
    }
    if (causa instanceof ApiError) {
      return NextResponse.json(
        {
          erro:
            mensagemDeCameraOffline(causa) ??
            "Não foi possível mudar o microfone.",
        },
        { status: statusSeguro(causa) },
      );
    }
    throw causa;
  }
}
