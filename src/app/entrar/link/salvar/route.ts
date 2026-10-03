import { NextResponse, type NextRequest } from "next/server";

import { aceitarConvite, ApiError, definirNovaSenha, trocarTokenDeLogin } from "@/lib/api";
import { ipDoNavegador } from "@/lib/ip-do-navegador";
import {
  eTipoDeLink,
  estadoDoEnvioPorStatus,
  origemDoProprioApp,
  TAMANHO_MAXIMO_DO_TOKEN,
  type EstadoDoEnvio,
  type TipoDeLink,
} from "@/lib/link-de-conta";
import { agoraEmSegundos } from "@/lib/sessao-assinada";
import { gravarCookieDeSessao } from "@/lib/sessao-cookie";

/**
 * Cria a conta do convite (ou define a nova senha) e ja' deixa a pessoa
 * logada: troca o token de login por sessao e grava o cookie, como
 * /entrar/tentar faz no login. Responde SEMPRE 200 com {estado}, menos 403
 * (outra origem) e 400 (corpo quebrado).
 *
 * "ligando" so' aparece se a API dormiu entre a leitura do link e o envio
 * (raro: a pessoa acabou de abrir a pagina). A tela entao tenta de novo, e
 * isso e' seguro: o backend so' queima o link quando a conta nasce.
 *
 * A senha nunca vai pra log: em erro, so' o status.
 */

export const dynamic = "force-dynamic";

// Teto largo so' pra cortar lixo; o backend aplica a regra real (72 bytes).
const TAMANHO_MAXIMO_DA_SENHA = 1024;
const TAMANHO_MAXIMO_DO_NOME = 200;

export async function POST(request: NextRequest) {
  if (!origemDoProprioApp(request.headers.get("origin"), request.url)) {
    console.warn("[entrar/link/salvar] origem recusada");
    return NextResponse.json({ erro: "origem recusada" }, { status: 403 });
  }

  const corpo = await lerCorpo(request);
  if (!corpo) return NextResponse.json({ erro: "corpo invalido" }, { status: 400 });

  const ip = ipDoNavegador(request);
  let tokenDeLogin: string;
  try {
    tokenDeLogin =
      corpo.tipo === "convite"
        ? await aceitarConvite({ token: corpo.token, nome: corpo.nome, senha: corpo.senha, ip })
        : await definirNovaSenha({ token: corpo.token, senha: corpo.senha, ip });
  } catch (causa) {
    if (!(causa instanceof ApiError)) throw causa;
    const estado = estadoDoEnvioPorStatus(causa.status);
    if (estado === "erro") console.error(`[entrar/link/salvar] API respondeu ${causa.status}`);
    return NextResponse.json({ estado });
  }

  try {
    const { sessao, usuario } = await trocarTokenDeLogin(tokenDeLogin);
    const resposta = NextResponse.json({ estado: "pronto" satisfies EstadoDoEnvio });
    await gravarCookieDeSessao(resposta, {
      sessao,
      validadoEm: agoraEmSegundos(),
      nome: usuario.nome ?? "",
      email: usuario.email,
      papel: usuario.papel,
    });
    return resposta;
  } catch (causa) {
    // A conta JA' existe (ou a senha ja' mudou): o que falhou foi so' entrar.
    // "erro" leva a pessoa a tentar o login normal, que funciona.
    console.error("[entrar/link/salvar] falha ao trocar o token:", causa);
    return NextResponse.json({ estado: "erro" satisfies EstadoDoEnvio });
  }
}

async function lerCorpo(
  request: NextRequest,
): Promise<{ token: string; tipo: TipoDeLink; nome: string; senha: string } | null> {
  try {
    const corpo = (await request.json()) as Record<string, unknown>;
    const token = typeof corpo.token === "string" ? corpo.token.trim() : "";
    const nome = typeof corpo.nome === "string" ? corpo.nome : "";
    const senha = typeof corpo.senha === "string" ? corpo.senha : "";
    if (
      !token ||
      token.length > TAMANHO_MAXIMO_DO_TOKEN ||
      !eTipoDeLink(corpo.tipo) ||
      !senha ||
      senha.length > TAMANHO_MAXIMO_DA_SENHA ||
      nome.length > TAMANHO_MAXIMO_DO_NOME
    ) {
      return null;
    }
    return { token, tipo: corpo.tipo, nome, senha };
  } catch {
    return null;
  }
}
