import { NextResponse } from "next/server";

import { statusSeguro } from "@/app/api/admin/_lib/status-seguro";
import { ApiError, trocarModoCamera } from "@/lib/api";
import { ehModoCamera } from "@/lib/modos-camera";
import type { ModoCamera } from "@/lib/types";

/**
 * Ponte de escrita "trocar o modo da camera" da tela "Camera".
 *
 * O navegador chama AQUI (POST /api/camera/modo), e esta rota, rodando no
 * servidor, repassa para a API do CUPCAM com a X-API-Key. "use client" nao
 * pode importar lib/api.ts (server-only), entao a chave nunca aparece no
 * JavaScript do usuario.
 *
 * Corpo: {"modo": "aula" | "descanso" | "prova"}.
 */

export const dynamic = "force-dynamic";

/** Modo valido vindo do corpo, ou null se ausente/desconhecido. */
async function lerModo(requisicao: Request): Promise<ModoCamera | null> {
  try {
    const corpo = (await requisicao.json()) as { modo?: unknown };
    return ehModoCamera(corpo?.modo) ? corpo.modo : null;
  } catch {
    return null;
  }
}

export async function POST(requisicao: Request) {
  const modo = await lerModo(requisicao);
  if (modo === null) {
    // Diferente de Ligar, aqui NAO ha default seguro: trocar pro modo errado
    // muda o que a camera grava no banco, entao um corpo invalido e' recusado
    // em vez de virar "aula" em silencio.
    return NextResponse.json({ erro: "Modo de câmera inválido." }, { status: 422 });
  }

  try {
    return NextResponse.json(await trocarModoCamera(modo));
  } catch (causa) {
    if (causa instanceof ApiError) {
      return NextResponse.json(
        { erro: "Não foi possível trocar o modo da câmera." },
        { status: statusSeguro(causa) },
      );
    }
    throw causa;
  }
}
