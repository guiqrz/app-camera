/**
 * Assinatura do cookie de sessao — modulo PURO (so' Web Crypto, sem Next, sem
 * `process.env`, sem alias `@/`).
 *
 * POR QUE ASSINAR: ate' 26/09/2026 o proxy so' conferia se o cookie EXISTIA.
 * `curl -H "Cookie: cupcam_sessao=inventado"` passava direto pras rotas
 * /api/*, que chamam a API do CUPCAM com a chave global — ou seja, qualquer
 * valor inventado abria nome e RA de aluno. Com a assinatura, so' um cookie
 * que ESTE servidor gravou (depois de um login real) e' aceito, sem precisar
 * perguntar ao backend a cada clique.
 *
 * Formato do valor: `<sessao>.<validadoEm>.<assinatura>`
 *   sessao      o id de sessao que o backend devolveu no /auth/trocar-token
 *   validadoEm  epoch em SEGUNDOS da ultima vez que o backend confirmou a
 *               sessao. Vai dentro da assinatura de proposito: sem isso,
 *               bastaria editar o numero pra fugir da revalidacao periodica.
 *   assinatura  HMAC-SHA256, base64url sem padding, de "<sessao>.<validadoEm>"
 *
 * Por que "puro": roda igual no proxy (Node), nos Route Handlers e no
 * `node --test` (ver sessao-assinada.test.ts) — os testes importam este
 * arquivo direto, entao ele nao pode depender de nada que so' existe no Next.
 */

const codificador = new TextEncoder();

/** Sessao lida de um cookie cuja assinatura conferiu. */
export type SessaoAssinada = {
  sessao: string;
  validadoEm: number;
};

/**
 * De quanto em quanto tempo (s) o proxy volta a perguntar ao backend se a
 * sessao ainda vale. 5 min: logout em outro lugar ou conta desativada param de
 * funcionar em no maximo isso, sem pagar uma ida a rede a cada navegacao.
 */
export const INTERVALO_REVALIDACAO_S = 300;

// validadoEm e' um inteiro nao negativo, sem sinal nem expoente. Ate' 12
// digitos cobre qualquer epoch razoavel e barra numeros absurdos logo no parse.
const FORMATO_VALIDADO_EM = /^\d{1,12}$/;

// HMAC-SHA256 tem 32 bytes = 43 caracteres em base64url sem padding.
const FORMATO_ASSINATURA = /^[A-Za-z0-9_-]{43}$/;

function paraBase64Url(bytes: Uint8Array): string {
  let binario = "";
  for (const byte of bytes) binario += String.fromCharCode(byte);
  return btoa(binario).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function deBase64Url(texto: string): Uint8Array<ArrayBuffer> | null {
  // Completa o padding que o base64url tira: comprimento % 4 == 1 nunca e'
  // valido e cai no catch do atob.
  const base64 =
    texto.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((texto.length + 3) % 4);
  try {
    const binario = atob(base64);
    const bytes = new Uint8Array(binario.length);
    for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);
    return bytes;
  } catch {
    return null;
  }
}

function importarChave(segredo: string, uso: "sign" | "verify"): Promise<CryptoKey> {
  if (!segredo) {
    // Nunca assinar com segredo vazio: um HMAC de chave vazia e' trivialmente
    // reproduzivel por qualquer um.
    throw new Error("Segredo da sessao vazio.");
  }
  return crypto.subtle.importKey(
    "raw",
    codificador.encode(segredo),
    { name: "HMAC", hash: "SHA-256" },
    false,
    [uso],
  );
}

/**
 * Monta o valor do cookie: `<sessao>.<validadoEm>.<assinatura>`.
 *
 * @throws se a sessao vier vazia, se validadoEm nao for inteiro >= 0 ou se o
 *         segredo estiver vazio — tudo erro de programacao, nao de usuario.
 */
export async function assinarSessao(
  sessao: string,
  validadoEm: number,
  segredo: string,
): Promise<string> {
  if (!sessao) throw new Error("Sessao vazia nao pode ser assinada.");
  if (!Number.isSafeInteger(validadoEm) || validadoEm < 0) {
    throw new Error(`validadoEm invalido: ${validadoEm}`);
  }

  const conteudo = `${sessao}.${validadoEm}`;
  const chave = await importarChave(segredo, "sign");
  const assinatura = await crypto.subtle.sign("HMAC", chave, codificador.encode(conteudo));
  return `${conteudo}.${paraBase64Url(new Uint8Array(assinatura))}`;
}

/**
 * Confere o valor do cookie e devolve a sessao, ou `null` se o formato estiver
 * quebrado ou a assinatura nao bater (adulterado, forjado ou gravado com outro
 * segredo). Nunca lanca por causa do VALOR — so' por segredo vazio.
 *
 * A comparacao da assinatura e' do proprio `crypto.subtle.verify`, que e' em
 * tempo constante; comparar strings com `===` vazaria, pelo tempo de resposta,
 * quantos caracteres do inicio estao certos.
 */
export async function verificarSessaoAssinada(
  valor: string,
  segredo: string,
): Promise<SessaoAssinada | null> {
  // Segredo vazio e' erro de configuracao: falha ja', antes do parse, pra nao
  // depender de o cookie da vez estar bem formado pra o defeito aparecer.
  if (!segredo) throw new Error("Segredo da sessao vazio.");

  // Parse pela DIREITA: a assinatura e o validadoEm nunca tem ".", entao isso
  // funciona mesmo se um dia o id de sessao do backend passar a ter ponto.
  const fimConteudo = valor.lastIndexOf(".");
  if (fimConteudo <= 0) return null;
  const conteudo = valor.slice(0, fimConteudo);
  const assinaturaTexto = valor.slice(fimConteudo + 1);

  const fimSessao = conteudo.lastIndexOf(".");
  if (fimSessao <= 0) return null;
  const sessao = conteudo.slice(0, fimSessao);
  const validadoEmTexto = conteudo.slice(fimSessao + 1);

  if (!FORMATO_VALIDADO_EM.test(validadoEmTexto)) return null;
  if (!FORMATO_ASSINATURA.test(assinaturaTexto)) return null;

  const assinatura = deBase64Url(assinaturaTexto);
  if (!assinatura) return null;

  const chave = await importarChave(segredo, "verify");
  const confere = await crypto.subtle.verify(
    "HMAC",
    chave,
    assinatura,
    codificador.encode(conteudo),
  );
  if (!confere) return null;

  return { sessao, validadoEm: Number(validadoEmTexto) };
}

/**
 * A sessao precisa ser reconfirmada com o backend?
 *
 * Um `validadoEm` no FUTURO alem de uma folga (relogio do servidor voltou, ou
 * outra instancia adiantada) tambem conta como vencido: melhor uma ida a rede
 * a mais que um cookie que nunca mais seria revalidado. A folga de 60 s evita
 * o contrario — instancias com relogios levemente diferentes revalidando a
 * cada clique.
 */
export function precisaRevalidar(
  validadoEm: number,
  agora: number,
  intervalo: number = INTERVALO_REVALIDACAO_S,
): boolean {
  return agora - validadoEm > intervalo || validadoEm > agora + FOLGA_RELOGIO_S;
}

const FOLGA_RELOGIO_S = 60;

/** Epoch atual em segundos — o mesmo relogio usado em `validadoEm`. */
export function agoraEmSegundos(): number {
  return Math.floor(Date.now() / 1000);
}
