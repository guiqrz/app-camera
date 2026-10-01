/**
 * Altura do campo de pergunta que cresce com o texto (01/10/2026): comeca com
 * `minLinhas`, acompanha o que o professor escreve ate' `maxLinhas` e so'
 * entao passa a rolar por dentro. Pura, pra ter teste sem navegador.
 */
export function alturaDoCampo({
  alturaConteudo,
  alturaLinha,
  folga,
  minLinhas,
  maxLinhas,
}: {
  /** `scrollHeight` do textarea medido com altura `auto`. */
  alturaConteudo: number;
  alturaLinha: number;
  /** Padding vertical somado (o `scrollHeight` ja' inclui). */
  folga: number;
  minLinhas: number;
  maxLinhas: number;
}): { altura: number; rolar: boolean } {
  const minima = alturaLinha * minLinhas + folga;
  const maxima = alturaLinha * maxLinhas + folga;
  return {
    altura: Math.min(Math.max(alturaConteudo, minima), maxima),
    // Meio pixel de tolerancia: arredondamento do navegador nao pode ligar a
    // barra de rolagem num campo que cabe exatamente em 4 linhas.
    rolar: alturaConteudo > maxima + 0.5,
  };
}
