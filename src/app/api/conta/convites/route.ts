import { NextResponse, type NextRequest } from "next/server";

import { comSessao, lerCorpo, linkCompleto, respostaDeErro } from "@/app/api/conta/_lib/ponte";
import { criarConvite } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const corpo = await lerCorpo(request);
  if (typeof corpo?.email !== "string" || typeof corpo?.papel !== "string") {
    return respostaDeErro("Preencha o email e o papel.", 400);
  }
  return comSessao(request, async (lida) => {
    const gerado = await criarConvite(lida.sessao, corpo.email as string, corpo.papel as string);
    return NextResponse.json(
      { link: linkCompleto(request, "convite", gerado.token), expiraEm: gerado.expira_em },
      { status: 201 },
    );
  });
}
