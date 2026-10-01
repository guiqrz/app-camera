/**
 * Funcao pura do carrossel de cartoes da abertura do Cup AI (01/10/2026),
 * separada do componente pra ter teste sem navegador (`npm test`).
 */

/**
 * Folga, em pixels, pra decidir que a trilha chegou numa ponta. O navegador
 * para o scroll em valor FRACIONARIO com zoom ou escala do Windows (125%): sem
 * folga, a seta da direita nunca sumia no fim.
 */
const FOLGA_DA_PONTA = 2;

/** Quais setas fazem sentido dado o scroll atual da trilha. */
export function estadoDasSetas(
  rolado: number,
  larguraVisivel: number,
  larguraTotal: number,
): { anterior: boolean; proxima: boolean } {
  return {
    anterior: rolado > FOLGA_DA_PONTA,
    proxima: rolado + larguraVisivel < larguraTotal - FOLGA_DA_PONTA,
  };
}
