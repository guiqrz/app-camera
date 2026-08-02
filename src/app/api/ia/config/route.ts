import { NextResponse } from "next/server";

import { statusSeguro } from "@/app/api/admin/_lib/status-seguro";
import { ApiError, lerConfiguracaoIA, trocarModeloIA } from "@/lib/api";

/**
 * Ponte da configuracao do Cup AI: ler (GET) e trocar o modelo (PUT).
 *
 * O GET diz se ha chave de API no servidor ANTES de o professor escrever uma
 * pergunta inteira — sem chave, a API responde 503, e descobrir isso so' depois
 * de digitar seria perder o texto por nada.
 *
 * O PUT vem da tela de Configuracoes, nao do chat: trocar de modelo e' ajuste
 * de conta, nao parte de fazer uma pergunta.
 */

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await lerConfiguracaoIA());
  } catch (causa) {
    if (causa instanceof ApiError) {
      return NextResponse.json(
        {
          erro: "Não foi possível falar com a API do CUPCAM. Verifique se o notebook da sala está ligado.",
        },
        { status: statusSeguro(causa) },
      );
    }
    throw causa;
  }
}

export async function PUT(requisicao: Request) {
  let dados: unknown;
  try {
    dados = await requisicao.json();
  } catch {
    return NextResponse.json(
      { erro: "Corpo da requisição inválido." },
      { status: 400 },
    );
  }

  const modelo =
    typeof dados === "object" &&
    dados !== null &&
    "modelo" in dados &&
    typeof (dados as { modelo: unknown }).modelo === "string"
      ? (dados as { modelo: string }).modelo.trim()
      : "";

  if (!modelo) {
    return NextResponse.json({ erro: "Escolha um modelo." }, { status: 400 });
  }

  try {
    return NextResponse.json(await trocarModeloIA(modelo));
  } catch (causa) {
    if (causa instanceof ApiError) {
      // 400 e' a lista curada recusando o id. Devolvido cru, e nao por
      // statusSeguro: fora da allowlist dele o 400 viraria 502, e a tela leria
      // uma recusa de negocio como "a API caiu". A tela so' oferece modelos da
      // propria lista, entao isto significa app e API em versoes diferentes.
      if (causa.status === 400) {
        return NextResponse.json(
          { erro: "Este modelo não está disponível nesta versão do CUPCAM." },
          { status: 400 },
        );
      }
      return NextResponse.json(
        { erro: "Não foi possível trocar o modelo. Tente novamente em instantes." },
        { status: statusSeguro(causa) },
      );
    }
    throw causa;
  }
}
