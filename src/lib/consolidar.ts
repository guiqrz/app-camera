/**
 * Consolida os dados de todas as aulas de uma turma num resumo geral.
 *
 * A API nao entrega esse consolidado pronto (so' tem relatorio POR sessao e
 * contagens em /estatisticas), entao calculamos aqui a partir da lista de
 * aulas. Tudo derivado de dado real — nada inventado. Aulas sem leitura de
 * engajamento (engajamento_pct null) sao ignoradas nas medias, mas contam no
 * total de aulas.
 */

import type { AulaCard, EstatisticasDaTurma, StatusEngajamento } from "./types";

export type ResumoTurma = {
  /** Total de aulas monitoradas (com ou sem leitura). */
  totalAulas: number;
  /** Aulas que tem leitura de engajamento. */
  aulasComDados: number;
  /** Media de engajamento das aulas com dado. Null se nenhuma tem. */
  engajamentoMedio: number | null;
  /** Aula de maior e menor engajamento (entre as que tem dado). */
  melhorAula: AulaCard | null;
  piorAula: AulaCard | null;
  /** Quantas aulas em cada faixa de status. */
  distribuicao: Record<StatusEngajamento, number>;
  /** Engajamento por aula, em ordem cronologica, para o grafico de tendencia. */
  serie: { data: string; engajamento: number; sessaoId: number }[];
  alunosAnalisados: number;
  periodo: { primeira: string | null; ultima: string | null };
};

export function consolidarTurma(
  aulas: AulaCard[],
  estatisticas: EstatisticasDaTurma,
): ResumoTurma {
  const comDados = aulas.filter((a) => a.engajamento_pct !== null);

  const engajamentoMedio =
    comDados.length === 0
      ? null
      : Math.round(
          comDados.reduce((soma, a) => soma + (a.engajamento_pct ?? 0), 0) /
            comDados.length,
        );

  // Melhor e pior aula por engajamento. reduce sobre a lista ja filtrada.
  const melhorAula =
    comDados.length === 0
      ? null
      : comDados.reduce((melhor, a) =>
          (a.engajamento_pct ?? 0) > (melhor.engajamento_pct ?? 0) ? a : melhor,
        );

  const piorAula =
    comDados.length === 0
      ? null
      : comDados.reduce((pior, a) =>
          (a.engajamento_pct ?? 0) < (pior.engajamento_pct ?? 0) ? a : pior,
        );

  const distribuicao: Record<StatusEngajamento, number> = {
    alto: 0,
    moderado: 0,
    atencao: 0,
  };
  for (const aula of aulas) {
    if (aula.status) distribuicao[aula.status] += 1;
  }

  // Serie em ordem cronologica (a API devolve da mais recente pra antiga).
  const serie = comDados
    .map((a) => ({
      data: a.data,
      engajamento: a.engajamento_pct as number,
      sessaoId: a.sessao_id,
    }))
    .sort((x, y) => x.data.localeCompare(y.data));

  return {
    totalAulas: aulas.length,
    aulasComDados: comDados.length,
    engajamentoMedio,
    melhorAula,
    piorAula,
    distribuicao,
    serie,
    alunosAnalisados: estatisticas.alunos_analisados,
    periodo: {
      primeira: estatisticas.primeira_sessao,
      ultima: estatisticas.ultima_sessao,
    },
  };
}
