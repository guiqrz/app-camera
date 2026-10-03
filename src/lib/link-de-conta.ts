/**
 * Regras das paginas de link (/convite/<token> e /nova-senha/<token>):
 * traducao dos codigos da API em estados de tela, validacao do formulario e
 * conferencia de origem. Modulo PURO — sem React, sem Next, sem alias `@/` —
 * pra rodar direto no `node --test` (link-de-conta.test.ts).
 */

export type TipoDeLink = "convite" | "nova_senha";

export type EstadoDaLeitura = "ligando" | "pronto" | "invalido" | "bloqueado" | "erro";

export type EstadoDoEnvio =
  | "ligando"
  | "pronto"
  | "invalido"
  | "duplicado"
  | "dados"
  | "bloqueado"
  | "erro";

/** Mesma regra do backend (gestao/usuarios.py). */
export const TAMANHO_MINIMO_DA_SENHA = 6;

/** O token real tem 43 caracteres (token_urlsafe(32)); o teto so' corta lixo. */
export const TAMANHO_MAXIMO_DO_TOKEN = 200;

export const MENSAGEM_LINK_INVALIDO = "Este link não vale mais. Peça um novo à coordenação.";

export const MENSAGEM_POR_ESTADO: Record<Exclude<EstadoDoEnvio, "pronto" | "ligando">, string> = {
  invalido: MENSAGEM_LINK_INVALIDO,
  duplicado: "Já existe uma conta com esse email.",
  dados: "Confira o nome e a senha digitados.",
  bloqueado: "Muitas tentativas. Aguarde alguns minutos e tente de novo.",
  erro: "O servidor está com problema agora. Tente de novo em instantes.",
};

// Status que significam "servidor ainda nao esta de pe" (0 = rede/timeout).
// O mesmo conjunto de /entrar/tentar.
const STATUS_LIGANDO = new Set([0, 502, 503, 504]);

export function eTipoDeLink(valor: unknown): valor is TipoDeLink {
  return valor === "convite" || valor === "nova_senha";
}

export function estadoDaLeituraPorStatus(status: number): Exclude<EstadoDaLeitura, "pronto"> {
  if (STATUS_LIGANDO.has(status)) return "ligando";
  if (status === 404) return "invalido";
  if (status === 429) return "bloqueado";
  return "erro";
}

export function estadoDoEnvioPorStatus(status: number): Exclude<EstadoDoEnvio, "pronto"> {
  if (STATUS_LIGANDO.has(status)) return "ligando";
  if (status === 404) return "invalido";
  if (status === 409) return "duplicado";
  if (status === 422) return "dados";
  if (status === 429) return "bloqueado";
  return "erro";
}

/**
 * O POST veio de uma pagina do PROPRIO app? Sem esta trava, outro site
 * poderia postar aqui um convite que ele mesmo gerou e deixar o navegador da
 * vitima logado na conta do atacante (login CSRF). O navegador sempre manda
 * Origin num POST de fetch, entao ausencia tambem e' recusa.
 */
export function origemDoProprioApp(origem: string | null, urlDaRequisicao: string): boolean {
  if (!origem || origem === "null") return false;
  return origem === new URL(urlDaRequisicao).origin;
}

type CampoDoFormulario = "nome" | "senha" | "confirmar";

/**
 * Validacao local antes de enviar (a do backend continua valendo). Devolve
 * null quando esta tudo certo, ou a mensagem e os campos culpados — que a
 * tela marca com aria-invalid, como o login do Strix.
 */
export function validarFormularioDeLink(campos: {
  tipo: TipoDeLink;
  nome: string;
  senha: string;
  confirmar: string;
}): { mensagem: string; campos: CampoDoFormulario[] } | null {
  const vazios: CampoDoFormulario[] = [];
  if (campos.tipo === "convite" && campos.nome.trim().length < 2) vazios.push("nome");
  if (campos.senha.length < TAMANHO_MINIMO_DA_SENHA) vazios.push("senha");
  if (vazios.length > 0) {
    return {
      mensagem:
        campos.tipo === "convite"
          ? "Preencha o nome e uma senha com pelo menos 6 caracteres."
          : "A senha precisa ter pelo menos 6 caracteres.",
      campos: vazios,
    };
  }
  if (campos.senha !== campos.confirmar) {
    return { mensagem: "As senhas não são iguais.", campos: ["confirmar"] };
  }
  return null;
}
