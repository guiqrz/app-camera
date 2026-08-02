import { NextResponse } from "next/server";

import { ApiError, resumirAula } from "@/lib/api";

/**
 * Ponte do resumo da aula, pro botao do relatorio.
 *
 * Nao usa `statusSeguro` pelo mesmo motivo da ponte de perguntar: a allowlist
 * dele (404/409/413/422) derrubaria pra 502 justamente o 503 (sem chave, que
 * nao e' erro nosso nem falha de rede) e apagaria a diferenca entre o 502 do
 * modelo e o "nao alcancei a API". A tela precisa dos tres separados.
 */

export const dynamic = "force-dynamic";

function traduzirFalha(causa: ApiError): { mensagem: string; status: number } {
  switch (causa.status) {
    case 404:
      return {
        mensagem: "Esta aula não tem transcrição para resumir.",
        status: 404,
      };
    case 409:
      return {
        mensagem:
          "A transcrição desta aula ainda está sendo gerada. Tente daqui a alguns minutos.",
        status: 409,
      };
    case 502:
      return {
        mensagem: "O assistente não conseguiu resumir agora. Tente de novo em instantes.",
        status: 502,
      };
    case 503:
      return {
        mensagem:
          "O assistente ainda não está configurado no servidor (falta a chave de API).",
        status: 503,
      };
    default:
      // 504 e nao 502: a requisicao nao chegou na API do CUPCAM. Mesma
      // distincao da ponte de perguntar.
      return {
        mensagem:
          "Não foi possível falar com a API do CUPCAM. Verifique se o notebook da sala está ligado.",
        status: 504,
      };
  }
}

export async function POST(
  _requisicao: Request,
  { params }: { params: Promise<{ sessaoId: string }> },
) {
  const { sessaoId } = await params;
  const id = Number(sessaoId);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ erro: "Aula inválida." }, { status: 422 });
  }

  try {
    return NextResponse.json(await resumirAula(id));
  } catch (causa) {
    if (causa instanceof ApiError) {
      const { mensagem, status } = traduzirFalha(causa);
      return NextResponse.json({ erro: mensagem }, { status });
    }
    throw causa;
  }
}
