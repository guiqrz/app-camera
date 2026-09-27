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
 * Formato do valor: `<conteudo>.<assinatura>`
 *   conteudo    JSON em base64url com {sessao, validadoEm, nome, email, papel}
 *     sessao      o id de sessao que o backend devolveu no /auth/trocar-token
 *     validadoEm  epoch em SEGUNDOS da ultima vez que o backend confirmou a
 *                 sessao. Vai dentro da assinatura de proposito: sem isso,
 *                 bastaria editar o numero pra fugir da revalidacao periodica.
 *     nome, email, papel  quem esta logado, pra barra lateral e (depois) pras
 *                 permissoes por papel. Assinados pelo mesmo motivo: trocar
 *                 "professor" por "admin" no cookie tem que invalidar tudo.
 *   assinatura  HMAC-SHA256, base64url sem padding, do `<conteudo>` codificado
 *
 * Por que JSON codificado (27/09/2026), e nao mais `sessao.validadoEm.assinatura`:
 * nome e email tem ponto, acento e espaco, e separar campos por "." deixaria
 * de funcionar. base64url nunca tem ".", entao o ponto volta a ser separador
 * seguro. Cookie no formato antigo falha no parse e o professor so' loga de
 * novo uma vez.
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
  /** Nome de exibicao; "" quando a conta ainda nao tem nome. */
  nome: string;
  email: string;
  papel: string;
};

const decodificador = new TextDecoder();

/**
 * De quanto em quanto tempo (s) o proxy volta a perguntar ao backend se a
 * sessao ainda vale. 5 min: logout em outro lugar ou conta desativada param de
 * funcionar em no maximo isso, sem pagar uma ida a rede a cada navegacao.
 */
export const INTERVALO_REVALIDACAO_S = 300;

// O conteudo codificado: so' caracteres de base64url, sem padding.
const FORMATO_BASE64URL = /^[A-Za-z0-9_-]+$/;

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

/** Assina um conteudo ja' codificado: `<conteudo>.<assinatura>`. */
async function assinarConteudo(conteudo: string, segredo: string): Promise<string> {
  const chave = await importarChave(segredo, "sign");
  const assinatura = await crypto.subtle.sign("HMAC", chave, codificador.encode(conteudo));
  return `${conteudo}.${paraBase64Url(new Uint8Array(assinatura))}`;
}

/**
 * So' pros testes: assina um conteudo arbitrario, pra provar que a leitura
 * recusa JSON bem assinado mas com forma errada. Nada no app chama isto.
 */
export const assinarConteudoParaTeste = assinarConteudo;

/**
 * Monta o valor do cookie: `<conteudo>.<assinatura>`.
 *
 * @throws se a sessao vier vazia, se validadoEm nao for inteiro >= 0 ou se o
 *         segredo estiver vazio — tudo erro de programacao, nao de usuario.
 */
export async function assinarSessao(dados: SessaoAssinada, segredo: string): Promise<string> {
  if (!dados.sessao) throw new Error("Sessao vazia nao pode ser assinada.");
  if (!Number.isSafeInteger(dados.validadoEm) || dados.validadoEm < 0) {
    throw new Error(`validadoEm invalido: ${dados.validadoEm}`);
  }

  // Monta o objeto campo a campo, e nao com `JSON.stringify(dados)`: assim um
  // campo extra que alguem passe por engano nunca vai parar no cookie.
  const { sessao, validadoEm, nome, email, papel } = dados;
  const json = JSON.stringify({ sessao, validadoEm, nome, email, papel });
  return assinarConteudo(paraBase64Url(codificador.encode(json)), segredo);
}

/**
 * Confere a FORMA do JSON ja' autenticado. A assinatura prova que fomos nos
 * que gravamos; isto garante que o que gravamos esta' inteiro — defesa contra
 * um bug nosso na gravacao virar sessao com campo faltando.
 */
function comoSessao(valor: unknown): SessaoAssinada | null {
  if (typeof valor !== "object" || valor === null || Array.isArray(valor)) return null;
  const { sessao, validadoEm, nome, email, papel } = valor as Record<string, unknown>;
  if (typeof sessao !== "string" || !sessao) return null;
  if (typeof validadoEm !== "number" || !Number.isSafeInteger(validadoEm) || validadoEm < 0) {
    return null;
  }
  if (typeof nome !== "string" || typeof email !== "string" || typeof papel !== "string") {
    return null;
  }
  return { sessao, validadoEm, nome, email, papel };
}

/**
 * Confere o valor do cookie e devolve a sessao, ou `null` se o formato estiver
 * quebrado ou a assinatura nao bater (adulterado, forjado, gravado com outro
 * segredo ou no formato antigo). Nunca lanca por causa do VALOR — so' por
 * segredo vazio.
 *
 * A comparacao da assinatura e' do proprio `crypto.subtle.verify`, que e' em
 * tempo constante; comparar strings com `===` vazaria, pelo tempo de resposta,
 * quantos caracteres do inicio estao certos. E a assinatura e' conferida
 * ANTES de decodificar o JSON: conteudo nao autenticado nunca chega ao parse.
 */
export async function verificarSessaoAssinada(
  valor: string,
  segredo: string,
): Promise<SessaoAssinada | null> {
  // Segredo vazio e' erro de configuracao: falha ja', antes do parse, pra nao
  // depender de o cookie da vez estar bem formado pra o defeito aparecer.
  if (!segredo) throw new Error("Segredo da sessao vazio.");

  const partes = valor.split(".");
  if (partes.length !== 2) return null;
  const [conteudo, assinaturaTexto] = partes as [string, string];
  if (!FORMATO_BASE64URL.test(conteudo)) return null;
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

  const bytes = deBase64Url(conteudo);
  if (!bytes) return null;
  try {
    return comoSessao(JSON.parse(decodificador.decode(bytes)));
  } catch {
    return null;
  }
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
