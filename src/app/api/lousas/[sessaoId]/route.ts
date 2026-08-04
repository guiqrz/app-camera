import { NextResponse } from "next/server";

import { statusSeguro } from "@/app/api/admin/_lib/status-seguro";
import { ApiError, listarLousas } from "@/lib/api";

/**
 * Ponte dos quadros guardados de uma aula (tela de Camera e relatorio).
 *
 * A leitura pelo Gemini acontece no backend DENTRO desta chamada, pro que
 * estiver pendente — entao a primeira requisicao depois de uma captura pode
 * demorar alguns segundos. E' o preco de o professor ver o texto na hora, em
 * vez de so' no fim da aula.
 *
 * Sem imagem no corpo: cada JPEG vem pela rota /[lousaId]/imagem.
 */

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ sessaoId: string }> };

export async function GET(_requisicao: Request, { params }: Params) {
  const { sessaoId } = await params;
  const id = Number(sessaoId);

  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ erro: "Sessão inválida." }, { status: 400 });
  }

  try {
    return NextResponse.json(await listarLousas(id));
  } catch (causa) {
    if (causa instanceof ApiError) {
      return NextResponse.json(
        { erro: "Não foi possível carregar os quadros desta aula." },
        { status: statusSeguro(causa) },
      );
    }
    throw causa;
  }
}
