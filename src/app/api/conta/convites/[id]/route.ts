import { NextResponse, type NextRequest } from "next/server";

import { comSessao, respostaDeErro } from "@/app/api/conta/_lib/ponte";
import { cancelarConvite } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const id = Number((await params).id);
  if (!Number.isSafeInteger(id) || id <= 0) return respostaDeErro("Convite inválido.", 400);
  return comSessao(request, async (lida) => {
    await cancelarConvite(lida.sessao, id);
    return new NextResponse(null, { status: 204 });
  });
}
