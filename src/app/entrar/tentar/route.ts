import { NextRequest, NextResponse } from "next/server";

import { ApiError, entrarPeloApp, trocarTokenDeLogin } from "@/lib/api";
import { decifrarLoginPendente } from "@/lib/login-pendente";
import { agoraEmSegundos } from "@/lib/sessao-assinada";
import {
  apagarCookieDeLoginPendente,
  apagarCookieDeState,
  COOKIE_LOGIN_PENDENTE,
  COOKIE_STATE_LOGIN,
  gravarCookieDeSessao,
  lerSegredoDaSessao,
} from "@/lib/sessao-cookie";
import { statesIguais } from "@/lib/state-login";

/**
 * Uma tentativa de login com as credenciais guardadas por /entrar/credenciais.
 * A tela /entrar/aguardando chama isto em sequencia ate' sair de "ligando".
 *
 * Devolve SEMPRE 200 com `{estado}` — a tela decide o que mostrar:
 *   ligando    API dormindo ou acordando (rede, timeout, 502/503/504)
 *   pronto     sessao gravada; a tela vai pro app
 *   senha      email ou senha errados
 *   bloqueado  muitas tentativas (429 do backend)
 *   expirou    sem pendente valido ou state que nao confere: volta ao login
 *   erro       qualquer outra resposta da API
 *
 * Em tudo que nao e' "ligando" os cookies do login sao APAGADOS: a senha nao
 * fica no navegador um segundo a mais do que o necessario.
 *
 * Mesmo-site por construcao: o cookie pendente e o de state sao SameSite=Lax,
 * entao um POST forjado por outro site chega aqui sem eles e cai em "expirou".
 */

export const dynamic = "force-dynamic";

type EstadoDoLogin = "ligando" | "pronto" | "senha" | "bloqueado" | "expirou" | "erro";

// Status que significam "servidor ainda nao esta de pe" (0 = rede/timeout).
const STATUS_LIGANDO = new Set([0, 502, 503, 504]);

export async function POST(request: NextRequest) {
  const bruto = request.cookies.get(COOKIE_LOGIN_PENDENTE)?.value;
  const stateEsperado = request.cookies.get(COOKIE_STATE_LOGIN)?.value;
  if (!bruto || !stateEsperado) return encerrar("expirou");

  const pendente = await decifrarLoginPendente(bruto, lerSegredoDaSessao(), agoraEmSegundos());
  if (!pendente || !statesIguais(pendente.state, stateEsperado)) {
    console.warn("[entrar/tentar] pendente invalido, vencido ou com state diferente");
    return encerrar("expirou");
  }

  let token: string;
  try {
    token = await entrarPeloApp({
      email: pendente.email,
      senha: pendente.senha,
      ip: ipDoNavegador(request),
    });
  } catch (causa) {
    if (!(causa instanceof ApiError)) throw causa;
    if (STATUS_LIGANDO.has(causa.status)) {
      return NextResponse.json({ estado: "ligando" satisfies EstadoDoLogin });
    }
    if (causa.status === 401 || causa.status === 422) return encerrar("senha");
    if (causa.status === 429) return encerrar("bloqueado");
    console.error(`[entrar/tentar] login recusado com status ${causa.status}`);
    return encerrar("erro");
  }

  try {
    const { sessao, usuario } = await trocarTokenDeLogin(token);
    const resposta = encerrar("pronto");
    await gravarCookieDeSessao(resposta, {
      sessao,
      validadoEm: agoraEmSegundos(),
      nome: usuario.nome ?? "",
      email: usuario.email,
      papel: usuario.papel,
    });
    return resposta;
  } catch (causa) {
    // O token vive 60 s e e' de uso unico: falhar aqui depois de um login
    // certo e' raro, e tentar de novo com o mesmo pendente repetiria o login.
    console.error("[entrar/tentar] falha ao trocar o token:", causa);
    return encerrar("erro");
  }
}

/** Responde com o estado final e apaga os dois cookies do login. */
function encerrar(estado: Exclude<EstadoDoLogin, "ligando">): NextResponse {
  const resposta = NextResponse.json({ estado });
  apagarCookieDeLoginPendente(resposta);
  apagarCookieDeState(resposta);
  return resposta;
}

/**
 * IP de quem abriu a pagina, pro limite de tentativas do backend. Na Vercel,
 * `x-real-ip` e' preenchido pela propria plataforma (o cliente nao consegue
 * forjar); `x-forwarded-for` fica de reserva. Sem nenhum, vai vazio e o
 * backend usa um balde comum — o lado restritivo.
 */
function ipDoNavegador(request: NextRequest): string {
  const real = request.headers.get("x-real-ip");
  if (real) return real.trim();
  const encaminhado = request.headers.get("x-forwarded-for");
  return encaminhado ? encaminhado.split(",")[0].trim() : "";
}
