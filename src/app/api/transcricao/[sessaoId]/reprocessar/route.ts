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
      const mensagem =
        causa.status === 409
          ? "Esta aula já está sendo transcrita."
          : "Não há áudio guardado para transcrever de novo.";
      return NextResponse.json({ erro: mensagem }, { status: statusSeguro(causa) });
    }
    throw causa;
  }
}
