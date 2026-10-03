import { NextResponse, type NextRequest } from "next/server";

import { ApiError, eSessaoInvalida } from "@/lib/api";
import { lerSessaoDoCookie } from "@/lib/sessao-cookie";
import type { SessaoAssinada } from "@/lib/sessao-assinada";

/**
 * Ponte das abas Conta e Equipe: o navegador chama /api/conta/*, esta rota
 * (no servidor) le a sessao do cookie HttpOnly e repassa pra API com a
 * X-API-Key + X-Sessao. O navegador nunca ve nem a chave nem a sessao.
 */

const MENSAGENS_POR_STATUS: Record<number, string> = {
  400: "Senha atual incorreta.",
  403: "Você não tem permissão para isso.",
  404: "Não encontrado. Atualize a página.",
  409: "Já existe uma conta com esse email.",
  422: "Confira os dados digitados.",
  429: "Muitas tentativas. Aguarde alguns minutos e tente de novo.",
};

export function respostaDeErro(mensagem: string, status: number): NextResponse {
  return NextResponse.json({ erro: mensagem }, { status });
}

/**
 * Traduz o erro da API pra tela. 401 de SESSAO vira 401 (a tela manda pro
 * login); 401 da CHAVE vira 502, porque e' configuracao do servidor e
 * deslogar a pessoa nao resolveria nada.
 */
export function traduzirErro(causa: unknown): NextResponse {
  if (eSessaoInvalida(causa)) {
    return respostaDeErro("Sua sessão expirou. Entre de novo.", 401);
  }
  if (causa instanceof ApiError) {
    const mensagem = MENSAGENS_POR_STATUS[causa.status];
    if (mensagem) return respostaDeErro(mensagem, causa.status);
    return respostaDeErro("O servidor está com problema agora. Tente de novo em instantes.", 502);
  }
  throw causa;
}

/** Roda `acao` com a sessao do cookie, ou devolve 401 sem nem chamar a API. */
export async function comSessao(
  request: NextRequest,
  acao: (lida: SessaoAssinada) => Promise<NextResponse>,
): Promise<NextResponse> {
  const lida = await lerSessaoDoCookie(request);
  if (!lida) return respostaDeErro("Sua sessão expirou. Entre de novo.", 401);
  try {
    return await acao(lida);
  } catch (causa) {
    return traduzirErro(causa);
  }
}

/** Corpo JSON ou `null` (corpo quebrado vira 400 em quem chama). */
export async function lerCorpo(request: NextRequest): Promise<Record<string, unknown> | null> {
  try {
    const corpo: unknown = await request.json();
    return corpo && typeof corpo === "object" && !Array.isArray(corpo)
      ? (corpo as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

/** Monta o link completo que a coordenacao copia, na origem desta requisicao. */
export function linkCompleto(request: NextRequest, caminho: "convite" | "nova-senha", token: string): string {
  return new URL(`/${caminho}/${encodeURIComponent(token)}`, request.url).toString();
}
