import { NextRequest, NextResponse } from "next/server";

import { encerrarSessao } from "@/lib/api";
import { apagarCookieDeSessao, lerSessaoDoCookie } from "@/lib/sessao-cookie";

/**
 * Logout: encerra a sessao no backend, apaga o cookie e volta pro login.
 *
 * POST, nao GET: um GET de logout pode ser disparado por qualquer <img> ou
 * link em outro site, e pelo prefetch do proprio Next ao passar o mouse.
 * Chamado pelo <form method="post" action="/sair"> das sidebars.
 *
 * Fora do matcher do proxy de proposito: sair tem que funcionar ate' com
 * cookie invalido — e' justamente o cookie que esta rota apaga.
 */
export async function POST(request: NextRequest) {
  // Barra POST vindo de OUTRO site (logout CSRF): o cookie de sessao e'
  // SameSite=Lax e nao viajaria, mas o Set-Cookie que apaga ele sim, e
  // qualquer pagina conseguiria deslogar o professor no meio da aula. Todo
  // navegador atual manda Sec-Fetch-Site; sem o header (curl, navegador
  // antigo) deixa passar, ja' que ai' nao ha site terceiro envolvido.
  const origemDoPedido = request.headers.get("sec-fetch-site");
  if (origemDoPedido && origemDoPedido !== "same-origin") {
    return NextResponse.json({ erro: "origem nao permitida" }, { status: 403 });
  }

  let lida = null;
  try {
    lida = await lerSessaoDoCookie(request);
  } catch (causa) {
    // Segredo ausente/curto: nao da' pra conferir o cookie, mas ainda da' pra
    // apaga-lo — sair nunca deve travar por configuracao.
    console.error("[sair] nao foi possivel ler o cookie de sessao:", causa);
  }

  // So' fala com o backend se o cookie e' autentico: um valor forjado nao tem
  // sessao nenhuma pra encerrar.
  if (lida) {
    try {
      await encerrarSessao(lida.sessao);
    } catch (causa) {
      // Falha de rede nao impede o logout LOCAL: o cookie some de qualquer
      // jeito. A sessao do backend fica orfa ate' expirar (7 dias) — sem o
      // cookie assinado, ninguem mais consegue usa-la por este app.
      console.error("[sair] falha ao encerrar a sessao no backend:", causa);
    }
  }

  // 303: o navegador troca o POST por GET ao seguir o redirect.
  const resposta = NextResponse.redirect(new URL("/entrar/iniciar", request.url), 303);
  apagarCookieDeSessao(resposta);
  return resposta;
}
