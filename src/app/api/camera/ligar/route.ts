import { NextResponse } from "next/server";

import { statusSeguro } from "@/app/api/admin/_lib/status-seguro";
import { ApiError, ligarCamera } from "@/lib/api";

/**
 * Ponte de escrita "Ligar camera" da tela "Camera".
 *
 * O navegador chama AQUI (POST /api/camera/ligar, sem corpo), e esta rota,
 * rodando no servidor, repassa para a API do CUPCAM com a X-API-Key.
 * "use client" nao pode importar lib/api.ts (server-only), entao a chave
 * nunca aparece no JavaScript do usuario.
 */

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    return NextResponse.json(await ligarCamera());
  } catch (causa) {
    if (causa instanceof ApiError) {
      if (causa.status === 409) {
        // Ja existe captura em andamento — mensagem especifica pro usuario
        // entender que nao precisa (nem pode) ligar de novo.
        return NextResponse.json(
          { erro: "A câmera já está em execução." },
          { status: 409 },
        );
      }
      return NextResponse.json(
        { erro: "Não foi possível ligar a câmera." },
        { status: statusSeguro(causa) },
      );
    }
    throw causa;
  }
}
