import { NextResponse } from "next/server";

import { statusSeguro } from "@/app/api/admin/_lib/status-seguro";
import { ApiError, gravarPlanoNaAgenda } from "@/lib/api";

/**
 * Ponte do "Gravar na agenda" do cartao do plano. O 409 do backend vira JSON
 * que o cartao entende: `plano_existente` (com a previa) pede confirmacao;
 * `sem_data` explica por que nao da' pra gravar.
 */

export const dynamic = "force-dynamic";

export async function POST(requisicao: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: bruto } = await params;
  const id = Number(bruto);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ erro: "Plano inválido." }, { status: 422 });
  }
  let substituir = false;
  try {
    const corpo = (await requisicao.json()) as { substituir?: unknown };
    substituir = corpo.substituir === true;
  } catch {
    // corpo vazio = nao substituir
  }

  try {
    return NextResponse.json(await gravarPlanoNaAgenda(id, substituir));
  } catch (causa) {
    if (causa instanceof ApiError) {
      if (causa.status === 409) {
        const detalhe = (causa.detalhe as { detail?: { motivo?: string; previa?: string } } | undefined)?.detail;
        if (detalhe?.motivo === "plano_existente") {
          return NextResponse.json({ motivo: "plano_existente", previa: detalhe.previa ?? "" }, { status: 409 });
        }
        return NextResponse.json({ motivo: "sem_data" }, { status: 409 });
      }
      if (causa.isNotFound) {
        return NextResponse.json({ erro: "Este plano de aula não existe mais." }, { status: 404 });
      }
      return NextResponse.json(
        { erro: "Não foi possível gravar na agenda. Tente de novo em instantes." },
        { status: statusSeguro(causa) },
      );
    }
    throw causa;
  }
}
