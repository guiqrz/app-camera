import { NextResponse } from "next/server";

import { statusSeguro } from "@/app/api/admin/_lib/status-seguro";
import { ApiError, reprocessarTranscricao } from "@/lib/api";

/** Ponte de escrita "tentar transcrever de novo". */

export const dynamic = "force-dynamic";

export async function POST(
  _requisicao: Request,
  { params }: { params: Promise<{ sessaoId: string }> },
) {
  const { sessaoId } = await params;
  const id = Number(sessaoId);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ erro: "Sessão inválida." }, { status: 422 });
  }

  try {
    return NextResponse.json(await reprocessarTranscricao(id));
  } catch (causa) {
    if (causa instanceof ApiError) {
      // Cada status ganha a mensagem do SEU caso. Antes qualquer erro que nao
      // fosse 409 virava "nao ha audio guardado": com o notebook da sala
      // desligado, o professor lia que o audio tinha sumido enquanto o WAV
      // estava no disco (bug de 31/07/2026). Afirmar a causa errada manda ele
      // procurar problema no lugar errado — pior que nao explicar nada.
      const mensagem =
        causa.status === 409
          ? "Esta aula já está sendo transcrita."
          : causa.status === 404
            ? "Não há áudio guardado para transcrever de novo."
            : "Não foi possível tentar de novo. Verifique se o notebook da sala está ligado.";
      return NextResponse.json({ erro: mensagem }, { status: statusSeguro(causa) });
    }
    throw causa;
  }
}
