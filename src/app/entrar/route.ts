import { timingSafeEqual } from "node:crypto";

import { NextRequest, NextResponse } from "next/server";

import { trocarTokenDeLogin } from "@/lib/api";
import { agoraEmSegundos } from "@/lib/sessao-assinada";
import {
  apagarCookieDeState,
  COOKIE_STATE_LOGIN,
  gravarCookieDeSessao,
  lerSegredoDaSessao,
} from "@/lib/sessao-cookie";

/**
 * Destino do redirect vindo do login.html (site Strix). Le ?token= e ?state=,
 * confere o state, troca o token por sessao real e grava o cookie HttpOnly
 * assinado antes de mandar o professor pra tela principal.
 *
 * Route Handler, nao Server Component: cookie HttpOnly so' pode ser
 * escrito em Server Action, Route Handler ou Proxy -- uma page.tsx
 * comum (mesmo async, sem "use client") lanca em runtime
 * ("Cookies can only be modified in a Server Action or Route Handler"),
 * erro so' visivel testando de verdade, nao no build.
 *
 * QUALQUER falha termina em /entrar/erro (com log no servidor), nunca num 500
 * cru: pro professor, "o login nao deu certo, tente de novo" e' a unica
 * informacao util; o detalhe tecnico fica no log.
 */
export async function GET(request: NextRequest) {
  const parametros = request.nextUrl.searchParams;
  const token = parametros.get("token");
  const state = parametros.get("state");
  const stateEsperado = request.cookies.get(COOKIE_STATE_LOGIN)?.value;

  // O state e' conferido ANTES de gastar o token: o token e' de uso unico, e
  // troca-lo num fluxo que vai ser recusado queimaria um login legitimo.
  const motivoRecusa = !token
    ? "sem token"
    : !state
      ? "sem state"
      : !stateEsperado
        ? "sem cookie de state (expirou ou login nao comecou em /entrar/iniciar)"
        : !statesIguais(state, stateEsperado)
          ? "state diferente do cookie"
          : null;
  if (motivoRecusa || !token) {
    console.warn(`[entrar] login recusado: ${motivoRecusa}`);
    return irParaErro(request);
  }

  try {
    // Le o segredo antes da troca pelo mesmo motivo: se faltar configuracao,
    // melhor falhar sem ter consumido o token.
    lerSegredoDaSessao();
    const { sessao, usuario } = await trocarTokenDeLogin(token);

    const resposta = NextResponse.redirect(new URL("/", request.url));
    apagarCookieDeState(resposta);
    await gravarCookieDeSessao(resposta, {
      sessao,
      validadoEm: agoraEmSegundos(),
      // `?? ""`: API anterior a 27/09/2026 nao manda `nome`. Sem isso o
      // cookie nasceria sem o campo e seria recusado na leitura seguinte.
      nome: usuario.nome ?? "",
      email: usuario.email,
      papel: usuario.papel,
    });
    return resposta;
  } catch (causa) {
    console.error("[entrar] falha ao concluir o login:", causa);
    return irParaErro(request);
  }
}

/** Redirect pra tela de erro, sempre descartando o state (uso unico). */
function irParaErro(request: NextRequest): NextResponse {
  const resposta = NextResponse.redirect(new URL("/entrar/erro", request.url));
  apagarCookieDeState(resposta);
  return resposta;
}

/**
 * Compara os dois states em tempo constante. `===` pararia no primeiro
 * caractere diferente, e o tempo de resposta revelaria quanto do inicio
 * esta certo. O comprimento pode vazar sem problema (e' sempre 43).
 */
function statesIguais(recebido: string, esperado: string): boolean {
  const a = Buffer.from(recebido);
  const b = Buffer.from(esperado);
  return a.length === b.length && timingSafeEqual(a, b);
}
