import { randomBytes } from "node:crypto";

import { NextResponse } from "next/server";

import { gravarCookieDeState, lerLoginUrl } from "@/lib/sessao-cookie";

/**
 * Comeco do login: gera o `state` anti-CSRF e manda pro site Strix.
 *
 * POR QUE EXISTE: sem `state`, /entrar?token=... aceitava qualquer token
 * valido. Um atacante fazia login na PROPRIA conta, pegava o token e mandava
 * a vitima abrir /entrar?token=<do atacante> — a vitima passava a usar o app
 * logada como o atacante, e o que ela cadastrasse ia pra conta dele (login
 * CSRF). Agora /entrar so' aceita o token se o `state` que volta junto bater
 * com o cookie gravado AQUI, no navegador de quem iniciou o login.
 *
 * O proxy manda pra ca' toda pagina sem sessao; o site Strix tambem, quando
 * e' aberto direto sem `?state=`.
 */
export function GET() {
  // 32 bytes aleatorios de CSPRNG: impossivel de adivinhar, e e' o que torna
  // o state inutil pro atacante (ele nao consegue ler o cookie da vitima).
  const state = randomBytes(32).toString("base64url");

  const destino = lerLoginUrl();
  destino.searchParams.set("state", state);

  const resposta = NextResponse.redirect(destino);
  gravarCookieDeState(resposta, state);
  return resposta;
}
