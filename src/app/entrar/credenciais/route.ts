import { NextRequest, NextResponse } from "next/server";

import { cifrarLoginPendente, DURACAO_LOGIN_PENDENTE_S } from "@/lib/login-pendente";
import { agoraEmSegundos } from "@/lib/sessao-assinada";
import {
  gravarCookieDeLoginPendente,
  lerLoginUrl,
  lerSegredoDaSessao,
} from "@/lib/sessao-cookie";
import { FORMATO_STATE } from "@/lib/state-login";

/**
 * Recebe o formulario de login do site Strix e manda o professor DIRETO pra
 * tela de espera, sem esperar a API acordar (29/09/2026). Antes ele ficava no
 * Strix com o botao girando ate' 90 s.
 *
 * Nao faz login aqui: guarda email, senha e state CIFRADOS num cookie
 * HttpOnly de 2 min (ver lib/login-pendente.ts) e redireciona. Quem tenta o
 * login e' /entrar/tentar, chamado pela tela de espera.
 *
 * O state NAO e' conferido aqui, e nao da' pra ser: este POST vem de outro
 * site, e o navegador nao manda cookie SameSite=Lax num POST entre sites —
 * o cookie de state simplesmente nao chega. A conferencia acontece em
 * /entrar/tentar, que e' mesmo-site. Um formulario forjado por um atacante
 * (login CSRF) grava um pendente com o state DELE, que nao bate com o cookie
 * da vitima, e morre la'.
 *
 * Qualquer entrada invalida volta pro comeco do login (/entrar/iniciar), sem
 * mensagem: o formulario do Strix ja' valida os campos antes de enviar, entao
 * chegar aqui torto nao e' uso normal.
 */

// Tetos de tamanho: email pelo RFC 5321, senha com folga larga (o bcrypt do
// backend so' usa 72 bytes e recusa acima disso com 401).
const TAMANHO_MAXIMO_EMAIL = 254;
const TAMANHO_MAXIMO_SENHA = 1024;

export async function POST(request: NextRequest) {
  // Defesa em profundidade: so' aceita formulario vindo do site de login. O
  // navegador sempre manda Origin num POST de formulario.
  const origem = request.headers.get("origin");
  if (origem !== null && origem !== lerLoginUrl().origin) {
    console.warn(`[entrar/credenciais] origem recusada: ${origem}`);
    return voltarAoInicio(request);
  }

  let formulario: FormData;
  try {
    formulario = await request.formData();
  } catch {
    return voltarAoInicio(request);
  }
  const email = formulario.get("email");
  const senha = formulario.get("senha");
  const state = formulario.get("state");
  if (
    typeof email !== "string" ||
    typeof senha !== "string" ||
    typeof state !== "string" ||
    email.trim() === "" ||
    senha === "" ||
    email.length > TAMANHO_MAXIMO_EMAIL ||
    senha.length > TAMANHO_MAXIMO_SENHA ||
    !FORMATO_STATE.test(state)
  ) {
    return voltarAoInicio(request);
  }

  const valor = await cifrarLoginPendente(
    {
      email: email.trim(),
      senha,
      state,
      expiraEm: agoraEmSegundos() + DURACAO_LOGIN_PENDENTE_S,
    },
    lerSegredoDaSessao(),
  );

  // 303: o navegador troca o POST por GET no redirect. Com 307 ele reenviaria
  // o formulario (com a senha) pra pagina de espera.
  const resposta = NextResponse.redirect(new URL("/entrar/aguardando", request.url), 303);
  gravarCookieDeLoginPendente(resposta, valor);
  return resposta;
}

function voltarAoInicio(request: NextRequest): NextResponse {
  return NextResponse.redirect(new URL("/entrar/iniciar", request.url), 303);
}
