import { NextResponse, type NextRequest } from "next/server";

import { ApiError, lerLinkDeConta } from "@/lib/api";
import { ipDoNavegador } from "@/lib/ip-do-navegador";
import {
  eTipoDeLink,
  estadoDaLeituraPorStatus,
  origemDoProprioApp,
  TAMANHO_MAXIMO_DO_TOKEN,
  type EstadoDaLeitura,
} from "@/lib/link-de-conta";

/**
 * Le um link de convite ou de nova senha pra pagina /convite ou /nova-senha.
 * A pagina chama isto em sequencia enquanto o estado for "ligando" (API
 * dormindo), igual a tela de espera do login com /entrar/tentar.
 *
 * Responde SEMPRE 200 com {estado} (a tela decide o que mostrar), menos:
 *   403  POST de outra origem (ver origemDoProprioApp)
 *   400  corpo quebrado — a propria pagina nunca manda assim
 *
 * Link de um tipo aberto na pagina do outro (convite em /nova-senha) e'
 * "invalido": a pagina so' serve pro tipo que a URL promete.
 */

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!origemDoProprioApp(request.headers.get("origin"), request.url)) {
    console.warn("[entrar/link] origem recusada");
    return NextResponse.json({ erro: "origem recusada" }, { status: 403 });
  }

  const corpo = await lerCorpo(request);
  if (!corpo) return NextResponse.json({ erro: "corpo invalido" }, { status: 400 });

  try {
    const link = await lerLinkDeConta(corpo.token, ipDoNavegador(request));
    if (link.tipo !== corpo.tipo) return responder("invalido");
    return NextResponse.json({ estado: "pronto" satisfies EstadoDaLeitura, email: link.email });
  } catch (causa) {
    if (!(causa instanceof ApiError)) throw causa;
    const estado = estadoDaLeituraPorStatus(causa.status);
    if (estado === "erro") console.error(`[entrar/link] API respondeu ${causa.status}`);
    return responder(estado);
  }
}

function responder(estado: Exclude<EstadoDaLeitura, "pronto">): NextResponse {
  return NextResponse.json({ estado });
}

async function lerCorpo(
  request: NextRequest,
): Promise<{ token: string; tipo: "convite" | "nova_senha" } | null> {
  try {
    const corpo = (await request.json()) as { token?: unknown; tipo?: unknown };
    const token = typeof corpo.token === "string" ? corpo.token.trim() : "";
    if (!token || token.length > TAMANHO_MAXIMO_DO_TOKEN || !eTipoDeLink(corpo.tipo)) return null;
    return { token, tipo: corpo.tipo };
  } catch {
    return null;
  }
}
