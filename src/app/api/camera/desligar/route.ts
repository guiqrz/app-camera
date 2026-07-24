import { NextResponse } from "next/server";

import { statusSeguro } from "@/app/api/admin/_lib/status-seguro";
import { ApiError, desligarCamera } from "@/lib/api";

/**
 * Ponte de escrita "Desligar camera" da tela "Camera".
 *
 * O navegador chama AQUI (POST /api/camera/desligar, sem corpo), e esta
 * rota, rodando no servidor, repassa para a API do CUPCAM com a X-API-Key.
 * "use client" nao pode importar lib/api.ts (server-only), entao a chave
 * nunca aparece no JavaScript do usuario.
 */

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    return NextResponse.json(await desligarCamera());
  } catch (causa) {
    if (causa instanceof ApiError) {
      // Desligar e' idempotente no backend (nunca da 409) — ramo generico
      // cobre tudo.
      return NextResponse.json(
        { erro: "Não foi possível desligar a câmera." },
        { status: statusSeguro(causa) },
      );
    }
    throw causa;
  }
}
