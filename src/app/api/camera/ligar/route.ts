import { NextResponse } from "next/server";

import { statusSeguro } from "@/app/api/admin/_lib/status-seguro";
import { ApiError, ligarCamera } from "@/lib/api";

/**
 * Ponte de escrita "Ligar camera" da tela "Camera".
 *
 * O navegador chama AQUI (POST /api/camera/ligar), e esta rota, rodando no
 * servidor, repassa para a API do CUPCAM com a X-API-Key. "use client" nao
 * pode importar lib/api.ts (server-only), entao a chave nunca aparece no
 * JavaScript do usuario.
 *
 * Corpo opcional {"turma_id": N}: turma escolhida a mao. Ausente/invalido =
 * o backend escolhe automatico por horario (nunca e' erro).
 */

export const dynamic = "force-dynamic";

/** Extrai um turma_id numerico do corpo, ou undefined se ausente/invalido. */
async function lerTurmaId(requisicao: Request): Promise<number | undefined> {
  try {
    const corpo = (await requisicao.json()) as { turma_id?: unknown };
    return typeof corpo?.turma_id === "number" ? corpo.turma_id : undefined;
  } catch {
    // Sem corpo ou corpo nao-JSON: liga no modo automatico.
    return undefined;
  }
}

export async function POST(requisicao: Request) {
  const turmaId = await lerTurmaId(requisicao);
  try {
    return NextResponse.json(await ligarCamera(turmaId));
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
