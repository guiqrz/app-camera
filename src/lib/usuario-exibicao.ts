/**
 * Como mostrar quem esta logado (barra lateral). Modulo PURO — sem React, sem
 * Next, sem alias `@/` — pra rodar direto no `node --test`
 * (usuario-exibicao.test.ts).
 */

/** Rotulo de cada papel da API (`usuarios.papel` no backend). */
const ROTULOS_DOS_PAPEIS: Record<string, string> = {
  admin: "Admin",
  coordenacao: "Coordenação",
  professor: "Professor",
  aluno: "Aluno",
};

/**
 * "coordenacao" -> "Coordenação". Papel desconhecido volta como veio em vez
 * de sumir: um papel novo no backend aparece cru ate' ganhar rotulo, e nao
 * como uma linha em branco.
 */
export function rotuloDoPapel(papel: string): string {
  return ROTULOS_DOS_PAPEIS[papel] ?? papel;
}

/**
 * Nome pra exibir. Conta sem nome (as criadas antes de 27/09/2026 nascem com
 * "") cai pra parte do email antes do "@": melhor que um espaco vazio, e
 * ainda reconhecivel pra quem e' o dono.
 */
export function nomeDeExibicao(nome: string, email: string): string {
  const limpo = nome.trim();
  if (limpo) return limpo;
  return email.split("@")[0] || email;
}

/**
 * Iniciais pro avatar: primeira letra do primeiro e do ultimo nome ("Ana
 * Lucia Prado" -> "AP"), ou so' uma quando o nome tem uma palavra ("Strix"
 * -> "S"). Sempre em maiuscula; vazio vira "?".
 */
export function iniciais(nomeExibido: string): string {
  const palavras = nomeExibido.trim().split(/\s+/).filter(Boolean);
  if (palavras.length === 0) return "?";
  const primeira = palavras[0]!.charAt(0);
  const ultima = palavras.length > 1 ? palavras.at(-1)!.charAt(0) : "";
  return (primeira + ultima).toLocaleUpperCase("pt-BR");
}
