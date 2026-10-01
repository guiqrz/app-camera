import { NextResponse } from "next/server";

import { statusSeguro } from "@/app/api/admin/_lib/status-seguro";
import { ApiError, gerarRoteiro } from "@/lib/api";

/**
 * Ponte do "Gerar roteiro" do cartao do plano. Pode esperar ~40s pelo backend
 * (insistencia + modelo de reserva quando o Gemini esta sobrecarregado).
 */

export const dynamic = "force-dynamic";

/**
 * Teto explicito. Com Fluid compute o padrao da Vercel ja' e' 300s (doc oficial,
 * lida em 01/10/2026), mas a rota declara o que precisa em vez de depender dele.
 */
export const maxDuration = 120;

export async function POST(
  _requisicao: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: bruto } = await params;
  const id = Number(bruto);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ erro: "Plano inválido." }, { status: 422 });
  }

  try {
    return NextResponse.json(await gerarRoteiro(id));
  } catch (causa) {
    if (causa instanceof ApiError) {
      if (causa.status === 409) {
        return NextResponse.json({ motivo: "sem_etapas" }, { status: 409 });
      }
      if (causa.isNotFound) {
        return NextResponse.json({ erro: "Este plano de aula não existe mais." }, { status: 404 });
      }
      if (causa.status === 503) {
        return NextResponse.json(
          { erro: "A IA está sobrecarregada agora. Tente de novo em instantes." },
          { status: 503 },
        );
      }
      if (causa.status === 502) {
        return NextResponse.json(
          { erro: "Não foi possível montar o roteiro. Tente gerar de novo." },
          { status: 502 },
        );
      }
      return NextResponse.json(
        { erro: "Não foi possível gerar o roteiro agora. Tente de novo em instantes." },
        { status: statusSeguro(causa) },
      );
    }
    throw causa;
  }
}
