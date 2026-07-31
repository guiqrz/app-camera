import { NextResponse } from "next/server";

import { statusSeguro } from "@/app/api/admin/_lib/status-seguro";
import { ApiError, ligarCamera } from "@/lib/api";
import { ehModoCamera } from "@/lib/modos-camera";
import type { ModoCamera } from "@/lib/types";

/**
 * Ponte de escrita "Ligar camera" da tela "Camera".
 *
 * O navegador chama AQUI (POST /api/camera/ligar), e esta rota, rodando no
 * servidor, repassa para a API do CUPCAM com a X-API-Key. "use client" nao
 * pode importar lib/api.ts (server-only), entao a chave nunca aparece no
 * JavaScript do usuario.
 *
 * Corpo opcional {"turma_id": N, "modo": "descanso", "audio": true}: turma,
 * modo e microfone escolhidos a mao antes de ligar. Ausente/invalido = o
 * backend escolhe automatico (turma por horario, modo Aula, audio conforme
 * CUPCAM_AUDIO_ATIVO do .env) — nunca e' erro.
 */

export const dynamic = "force-dynamic";

/**
 * Turma, modo e audio escolhidos no corpo. Todos opcionais e independentes:
 * ausente/invalido vira undefined, e o backend cai no automatico (turma por
 * horario, modo Aula, audio conforme CUPCAM_AUDIO_ATIVO do .env). Aqui um
 * valor invalido NAO e' erro — diferente de /api/camera/modo, este e' o
 * caminho em que "nao escolhi nada" e' normal.
 */
async function lerEscolhas(
  requisicao: Request,
): Promise<{ turmaId?: number; modo?: ModoCamera; audio?: boolean }> {
  try {
    const corpo = (await requisicao.json()) as {
      turma_id?: unknown;
      modo?: unknown;
      audio?: unknown;
    };
    return {
      turmaId: typeof corpo?.turma_id === "number" ? corpo.turma_id : undefined,
      modo: ehModoCamera(corpo?.modo) ? corpo.modo : undefined,
      audio: typeof corpo?.audio === "boolean" ? corpo.audio : undefined,
    };
  } catch {
    // Sem corpo ou corpo nao-JSON: liga no automatico.
    return {};
  }
}

export async function POST(requisicao: Request) {
  const { turmaId, modo, audio } = await lerEscolhas(requisicao);
  try {
    return NextResponse.json(await ligarCamera(turmaId, modo, audio));
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
