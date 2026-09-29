/**
 * Credenciais do login enquanto a API acorda — modulo PURO (so' Web Crypto,
 * sem Next, sem `process.env`, sem alias `@/`), pelo mesmo motivo de
 * sessao-assinada.ts: roda igual nos Route Handlers e no `node --test`.
 *
 * POR QUE EXISTE (29/09/2026): o professor ficava na tela do site Strix com o
 * botao girando ate' 90 s enquanto o Render acordava. Agora o Strix manda
 * email e senha direto pro app (que esta sempre de pe na Vercel), o app os
 * guarda AQUI por ate' 2 minutos e mostra a tela "servidores ligando", que
 * tenta o login em segundo plano.
 *
 * Guardar senha no navegador, mesmo por 2 minutos, pede cuidado. As travas:
 *   - AES-256-GCM: sem a chave nao se le NEM se altera o conteudo (a tag do
 *     GCM recusa qualquer byte trocado).
 *   - chave derivada por HKDF do segredo da sessao, com um rotulo proprio: o
 *     mesmo segredo nunca e' usado cru pra duas coisas (HMAC da sessao e
 *     cifra daqui).
 *   - prazo DENTRO do conteudo cifrado, alem do maxAge do cookie: um cookie
 *     copiado depois do prazo nao vale, mesmo reinjetado a mao.
 *   - o `state` anti-CSRF vai junto e e' conferido contra o cookie de state na
 *     hora de usar (ver /entrar/tentar).
 *   - quem grava o cookie o marca HttpOnly (ver sessao-cookie.ts): o
 *     JavaScript da pagina nunca ve o valor.
 *
 * Formato do valor: base64url( iv[12] || texto cifrado com a tag[16] no fim )
 */

const codificador = new TextEncoder();
const decodificador = new TextDecoder();

/** Quanto tempo o app segura as credenciais esperando a API acordar. */
export const DURACAO_LOGIN_PENDENTE_S = 120;

/** O que fica guardado enquanto a API acorda. */
export type LoginPendente = {
  email: string;
  senha: string;
  /** O `state` que veio junto do formulario do Strix. */
  state: string;
  /** Epoch em SEGUNDOS a partir do qual o pendente nao vale mais. */
  expiraEm: number;
};

// Rotulo do HKDF: separa esta chave de qualquer outro uso do mesmo segredo.
const ROTULO_DA_CHAVE = "cupcam/login-pendente/v1";
const TAMANHO_IV = 12;
const FORMATO_BASE64URL = /^[A-Za-z0-9_-]+$/;

async function derivarChave(segredo: string): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey(
    "raw",
    codificador.encode(segredo),
    "HKDF",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: new Uint8Array(0),
      info: codificador.encode(ROTULO_DA_CHAVE),
    },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

function paraBase64url(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64url");
}

/** Cifra o pendente. Devolve o valor pronto pro cookie. */
export async function cifrarLoginPendente(
  pendente: LoginPendente,
  segredo: string,
): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(TAMANHO_IV));
  const cifrado = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      await derivarChave(segredo),
      codificador.encode(JSON.stringify(pendente)),
    ),
  );
  const junto = new Uint8Array(iv.length + cifrado.length);
  junto.set(iv);
  junto.set(cifrado, iv.length);
  return paraBase64url(junto);
}

/**
 * Decifra e confere o pendente. `null` quando o valor foi alterado, veio de
 * outro segredo, esta malformado ou ja' venceu — a mesma resposta pros quatro:
 * em todos, o professor so' precisa voltar ao login.
 */
export async function decifrarLoginPendente(
  valor: string,
  segredo: string,
  agoraEmSegundos: number,
): Promise<LoginPendente | null> {
  if (!FORMATO_BASE64URL.test(valor)) return null;
  const bytes = new Uint8Array(Buffer.from(valor, "base64url"));
  // IV + tag de 16 bytes + ao menos 1 byte de conteudo.
  if (bytes.length <= TAMANHO_IV + 16) return null;

  let claro: string;
  try {
    claro = decodificador.decode(
      await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: bytes.slice(0, TAMANHO_IV) },
        await derivarChave(segredo),
        bytes.slice(TAMANHO_IV),
      ),
    );
  } catch {
    return null;
  }

  let dados: unknown;
  try {
    dados = JSON.parse(claro);
  } catch {
    return null;
  }
  const { email, senha, state, expiraEm } = (dados ?? {}) as Record<string, unknown>;
  if (
    typeof email !== "string" ||
    typeof senha !== "string" ||
    typeof state !== "string" ||
    typeof expiraEm !== "number" ||
    agoraEmSegundos >= expiraEm
  ) {
    return null;
  }
  return { email, senha, state, expiraEm };
}
