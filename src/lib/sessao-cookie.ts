/**
 * Cookies do login e as variaveis de ambiente que eles exigem.
 *
 * Concentra num lugar so' o que o proxy, /entrar, /entrar/iniciar e /sair
 * precisam combinar entre si: nomes, atributos e prazos dos cookies, o
 * segredo da assinatura e a URL do login. Espalhar isso pelos quatro arquivos
 * era pedir pra um deles gravar com `path` diferente e o outro nunca
 * conseguir apagar.
 *
 * "server-only" pelo mesmo motivo do api.ts: o segredo da assinatura nunca
 * pode ir parar no JavaScript do navegador.
 */

import "server-only";

import type { NextRequest, NextResponse } from "next/server";

import {
  assinarSessao,
  verificarSessaoAssinada,
  type SessaoAssinada,
} from "./sessao-assinada";

/** Cookie com a sessao assinada (ver sessao-assinada.ts pro formato). */
export const COOKIE_SESSAO = "cupcam_sessao";

/** Cookie com o `state` anti-CSRF entre /entrar/iniciar e /entrar. */
export const COOKIE_STATE_LOGIN = "cupcam_login_state";

/** A sessao do backend vive 7 dias; o cookie nao sobrevive a ela. */
const DURACAO_SESSAO_S = 7 * 24 * 60 * 60;

/** 10 min pra digitar e-mail e senha no site Strix e voltar. */
const DURACAO_STATE_S = 600;

/**
 * O state so' e' lido em /entrar; restringir o `path` evita que ele viaje em
 * toda requisicao do app.
 */
const PATH_STATE = "/entrar";

const emProducao = process.env.NODE_ENV === "production";

/** Tamanho minimo do segredo: 32 bytes em base64url dao 43 caracteres. */
const TAMANHO_MINIMO_SEGREDO = 32;

const COMO_GERAR_SEGREDO =
  "Gere um com: node -e \"console.log(require('crypto').randomBytes(32).toString('base64url'))\"";

/**
 * Le o segredo do HMAC do cookie.
 *
 * Falha ALTO, em dev tambem: nao ha segredo "de fallback" gerado em memoria
 * porque ele mudaria a cada reinicio (derrubando todo mundo) e, pior, cada
 * instancia da Vercel teria o seu — um login valeria so' na instancia que o
 * gravou. Segredo curto tambem e' recusado: HMAC com chave fraca e' forjavel.
 */
export function lerSegredoDaSessao(): string {
  const segredo = process.env.CUPCAM_SESSAO_SEGREDO;
  if (!segredo) {
    throw new Error(
      `CUPCAM_SESSAO_SEGREDO nao esta definida. Sem ela nao ha como assinar o cookie de sessao. ` +
        `Ponha no .env.local (dev) ou em Settings > Environment Variables (Vercel). ${COMO_GERAR_SEGREDO}`,
    );
  }
  if (segredo.length < TAMANHO_MINIMO_SEGREDO) {
    throw new Error(
      `CUPCAM_SESSAO_SEGREDO curta demais (${segredo.length} caracteres, minimo ${TAMANHO_MINIMO_SEGREDO}). ${COMO_GERAR_SEGREDO}`,
    );
  }
  return segredo;
}

/**
 * URL do login.html do site Strix.
 *
 * Variavel de SERVIDOR (sem NEXT_PUBLIC_): so' o /entrar/iniciar usa, e o
 * Next embutiria uma NEXT_PUBLIC_ no build — trocar o dominio do login
 * exigiria rebuild em vez de so' redeploy.
 *
 * Em producao, sem a variavel, ERRO: o fallback antigo pra localhost mandava
 * o professor pra uma pagina que nao existe na maquina dele, sem nenhuma pista
 * de que faltava configurar a Vercel. Em dev o default aponta pro
 * live-server que serve o site Strix na porta 5500, que e' o setup local.
 */
export function lerLoginUrl(): URL {
  const configurada = process.env.CUPCAM_LOGIN_URL;
  if (!configurada) {
    if (emProducao) {
      throw new Error(
        "CUPCAM_LOGIN_URL nao esta definida. E' a URL publica do login.html do site Strix — configure na Vercel.",
      );
    }
    return new URL("http://localhost:5500/html/login.html");
  }
  try {
    return new URL(configurada);
  } catch {
    throw new Error(`CUPCAM_LOGIN_URL nao e' uma URL valida: "${configurada}".`);
  }
}

/**
 * Le e confere o cookie de sessao da requisicao. `null` quando nao ha cookie
 * ou ele nao passa na assinatura.
 */
export async function lerSessaoDoCookie(
  request: NextRequest,
): Promise<SessaoAssinada | null> {
  const valor = request.cookies.get(COOKIE_SESSAO)?.value;
  if (!valor) return null;
  return verificarSessaoAssinada(valor, lerSegredoDaSessao());
}

/** Grava (ou regrava) o cookie de sessao assinado na resposta. */
export async function gravarCookieDeSessao(
  resposta: NextResponse,
  sessao: string,
  validadoEm: number,
): Promise<void> {
  const valor = await assinarSessao(sessao, validadoEm, lerSegredoDaSessao());
  resposta.cookies.set(COOKIE_SESSAO, valor, {
    httpOnly: true,
    secure: emProducao,
    sameSite: "lax",
    path: "/",
    maxAge: DURACAO_SESSAO_S,
  });
}

/** Apaga o cookie de sessao (mesmos atributos da gravacao, senao nao apaga). */
export function apagarCookieDeSessao(resposta: NextResponse): void {
  resposta.cookies.set(COOKIE_SESSAO, "", {
    httpOnly: true,
    secure: emProducao,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

/** Grava o `state` anti-CSRF do login. */
export function gravarCookieDeState(resposta: NextResponse, state: string): void {
  resposta.cookies.set(COOKIE_STATE_LOGIN, state, {
    httpOnly: true,
    secure: emProducao,
    // Lax, nao Strict: o retorno do site Strix pra /entrar e' uma navegacao
    // vinda de OUTRA origem, e Strict nao mandaria o cookie justo nela.
    sameSite: "lax",
    path: PATH_STATE,
    maxAge: DURACAO_STATE_S,
  });
}

/** Apaga o `state` — ele e' de uso unico, com ou sem sucesso no login. */
export function apagarCookieDeState(resposta: NextResponse): void {
  resposta.cookies.set(COOKIE_STATE_LOGIN, "", {
    httpOnly: true,
    secure: emProducao,
    sameSite: "lax",
    path: PATH_STATE,
    maxAge: 0,
  });
}
