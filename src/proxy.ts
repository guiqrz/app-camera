import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { ApiError, ConfiguracaoAusenteError, validarSessao } from "@/lib/api";
import { agoraEmSegundos, precisaRevalidar } from "@/lib/sessao-assinada";
import {
  apagarCookieDeSessao,
  COOKIE_SESSAO,
  gravarCookieDeSessao,
  lerSessaoDoCookie,
} from "@/lib/sessao-cookie";

/**
 * Barra qualquer rota sem cookie de sessao VALIDO.
 *
 * Next 16: este arquivo substitui o antigo `middleware.ts` (renomeado pra
 * `proxy`, runtime sempre nodejs — ver node_modules/next/dist/docs, guia
 * upgrading/version-16). E' o "optimistic check" do guia de autenticacao:
 * barra cedo e barato, mas nao substitui checagem dentro de cada rota.
 *
 * Duas camadas:
 *
 *   1. Assinatura (toda requisicao, sem rede). O cookie so' vale se foi
 *      gravado por ESTE servidor — antes (ate' 26/09/2026) bastava EXISTIR, e
 *      um `Cookie: cupcam_sessao=inventado` abria as rotas /api/*.
 *
 *   2. Revalidacao (a cada 5 min por cookie). Pergunta ao backend se a sessao
 *      ainda vale, pra que logout em outro lugar ou conta desativada parem de
 *      funcionar em no maximo esse intervalo — a assinatura sozinha nao sabe
 *      disso. Confirmada, o cookie e' regravado com o novo `validadoEm`.
 *
 * Sem sessao: pagina vai pra /entrar/iniciar (que gera o `state` e manda pro
 * site Strix); rota /api/* recebe 401 JSON. Redirecionar um fetch de /api/*
 * pra outra origem so' produzia um erro de CORS confuso no navegador.
 */
export async function proxy(request: NextRequest) {
  const lida = await lerSessaoDoCookie(request);
  if (!lida) return negarAcesso(request);

  const agora = agoraEmSegundos();
  if (!precisaRevalidar(lida.validadoEm, agora)) {
    return NextResponse.next();
  }

  let usuario;
  try {
    usuario = await validarSessao(lida.sessao);
  } catch (causa) {
    // API fora do ar, lenta (5 s de teto), com 5xx ou recusando a X-API-Key
    // do servidor (401/403, ver validarSessao): DEIXA PASSAR, sem
    // regravar o cookie — assim a proxima navegacao tenta de novo. O plano
    // gratuito do Render hiberna e leva 30-60 s pra acordar; barrar aqui
    // derrubaria TODO MUNDO do app a cada hibernacao, inclusive telas que nem
    // dependem da API. O risco aceito: uma sessao encerrada continua valendo
    // enquanto o backend estiver fora — e sem backend, as telas nao mostram
    // dado nenhum de qualquer jeito.
    if (causa instanceof ApiError || causa instanceof ConfiguracaoAusenteError) {
      console.error(
        `[proxy] revalidacao de sessao falhou (${
          causa instanceof ApiError ? `status ${causa.status}` : "configuracao"
        }); deixando passar sem regravar:`,
        causa.message,
      );
      return NextResponse.next();
    }
    throw causa;
  }

  if (!usuario) return negarAcesso(request);

  // Regrava com os dados que o backend acabou de confirmar: nome ou papel
  // trocados no banco chegam ao cookie (e a barra lateral) em ate' 5 min.
  const resposta = NextResponse.next();
  await gravarCookieDeSessao(resposta, {
    sessao: lida.sessao,
    validadoEm: agora,
    nome: usuario.nome ?? "",
    email: usuario.email,
    papel: usuario.papel,
  });
  return resposta;
}

/**
 * Resposta pra quem nao tem sessao valida. Apaga o cookie se havia um — ele
 * era forjado, de outro segredo ou de uma sessao que o backend encerrou, e
 * reenvia-lo a cada requisicao so' repetiria a mesma recusa.
 */
function negarAcesso(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;

  let resposta: NextResponse;
  if (pathname === "/api" || pathname.startsWith("/api/")) {
    resposta = NextResponse.json({ erro: "sessao invalida" }, { status: 401 });
  } else {
    // 307 preserva o metodo; pra algo que nao seja GET/HEAD (ex.: POST de
    // Server Action) usa 303, senao o navegador repetiria o POST em
    // /entrar/iniciar, que so' aceita GET.
    const leitura = request.method === "GET" || request.method === "HEAD";
    resposta = NextResponse.redirect(
      new URL("/entrar/iniciar", request.url),
      leitura ? 307 : 303,
    );
  }

  if (request.cookies.has(COOKIE_SESSAO)) apagarCookieDeSessao(resposta);
  return resposta;
}

export const config = {
  // Tudo, EXCETO:
  //   entrar(?:/|$)   /entrar e suas subrotas (iniciar, erro) — senao o login
  //                   nunca completaria. So' como segmento EXATO: o antigo
  //                   `entrar` solto liberaria tambem /entrarqualquercoisa.
  //   convite/ nova-senha/  paginas de link (conta nova e nova senha): quem
  //                   abre ainda nao tem sessao.
  //   auth/<arquivo>.png|svg  imagens dessas paginas (visual do Strix). So'
  //                   arquivo com extensao de imagem, pelo mesmo motivo da
  //                   regra da raiz abaixo.
  //   sair$           o logout precisa funcionar ate' com cookie invalido
  //                   (e' justamente o que ele apaga).
  //   _next/static, _next/image, favicon.ico   arquivos do proprio Next.
  //   api/saude       checagem de saude, sem dado nenhum.
  //   [^/]+\.ext$     arquivos de public/ na RAIZ (ex. /logo-cupcam.png).
  //                   So' na raiz e so' extensoes de arquivo estatico de
  //                   proposito: uma regra "qualquer coisa com ponto" liberaria
  //                   rotas dinamicas como /aulas/5.png sem sessao.
  matcher: [
    "/((?!entrar(?:/|$)|convite/|nova-senha/|auth/[^/]+\\.(?:png|svg)$|sair$|_next/static|_next/image|favicon\\.ico$|api/saude$|[^/]+\\.(?:png|jpe?g|gif|svg|webp|avif|ico|txt|xml|webmanifest|woff2?)$).*)",
  ],
};
