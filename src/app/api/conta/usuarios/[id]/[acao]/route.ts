import { NextResponse, type NextRequest } from "next/server";

import { comSessao, linkCompleto, respostaDeErro } from "@/app/api/conta/_lib/ponte";
import { desativarPessoa, gerarLinkNovaSenha, reativarPessoa } from "@/lib/api";

export const dynamic = "force-dynamic";

const ACOES = new Set(["nova-senha", "desativar", "reativar"]);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; acao: string }> },
) {
  const { id: idTexto, acao } = await params;
  const id = Number(idTexto);
  if (!Number.isSafeInteger(id) || id <= 0 || !ACOES.has(acao)) {
    return respostaDeErro("Ação inválida.", 400);
  }
  return comSessao(request, async (lida) => {
    if (acao === "nova-senha") {
      const gerado = await gerarLinkNovaSenha(lida.sessao, id);
      return NextResponse.json(
        { link: linkCompleto(request, "nova-senha", gerado.token), expiraEm: gerado.expira_em },
        { status: 201 },
      );
    }
    await (acao === "desativar" ? desativarPessoa : reativarPessoa)(lida.sessao, id);
    return new NextResponse(null, { status: 204 });
  });
}
