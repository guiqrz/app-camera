/**
 * Funcoes puras do cartao da lista de exercicios do Cup AI (29/09/2026).
 *
 * Separadas do componente pra ter teste sem navegador (`npm test`): o que o ✕
 * grava, a URL que cada botao de download chama e o texto da contagem.
 */

export type FormatoDaLista = "pdf" | "docx";
export type ParteDaLista = "lista" | "gabarito";

/**
 * Os ids da lista sem o que o professor tirou no ✕, na MESMA ordem.
 *
 * A ordem importa: e' a numeracao que o aluno vai ver no arquivo, e o backend
 * so' aceita remover ou reordenar — nunca por questao nova por aqui.
 */
export function semQuestao(questaoIds: number[], idRemovido: number): number[] {
  return questaoIds.filter((id) => id !== idRemovido);
}

/** URL da ponte de download (bytes do PDF/Word montados pelo backend). */
export function urlDoArquivo(
  listaId: number,
  formato: FormatoDaLista,
  parte: ParteDaLista,
): string {
  const consulta = new URLSearchParams({ formato, parte });
  return `/api/ia/listas/${encodeURIComponent(String(listaId))}/arquivo?${consulta}`;
}

/** "Nenhuma questão" · "1 questão" · "N questões". */
export function rotuloDaContagem(n: number): string {
  if (n === 0) return "Nenhuma questão";
  return n === 1 ? "1 questão" : `${n} questões`;
}
