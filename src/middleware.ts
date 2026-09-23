import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Barra qualquer rota sem cookie de sessao valido.
 *
 * Nao CONFERE a sessao contra a API aqui (isso exigiria uma chamada de
 * rede a cada navegacao) -- so' confere que o cookie EXISTE. A validacao
 * de verdade (a sessao e' real? o usuario esta ativo?) fica pras rotas
 * server-side que efetivamente usam o dado, quando a fatia 2 (isolar por
 * professor) chegar. Nesta fatia 1, existir o cookie e' suficiente: ele so'
 * e' gravado depois de um /auth/trocar-token bem-sucedido.
 *
 * PARA ONDE MANDA SEM SESSAO: nao ha URL fixa do site Strix aqui (pode
 * rodar em localhost, ngrok, ou dominio proprio depois) -- por isso
 * LOGIN_URL vem de variavel de ambiente, nunca hardcoded.
 */
const LOGIN_URL = process.env.NEXT_PUBLIC_LOGIN_URL ?? "http://localhost:5500/html/login.html";

export function middleware(request: NextRequest) {
  const sessao = request.cookies.get("cupcam_sessao");

  if (!sessao) {
    return NextResponse.redirect(LOGIN_URL);
  }

  return NextResponse.next();
}

export const config = {
  // Tudo, exceto: a propria rota /entrar (senao o redirect pos-login
  // nunca completaria), arquivos estaticos do Next e a rota de saude.
  matcher: ["/((?!entrar|_next/static|_next/image|favicon.ico|api/saude).*)"],
};
