import { CartaoNumero } from "@/components/aulas/cartao-numero";
import { MiniTendencia } from "@/components/aulas/mini-tendencia";
import {
  IconAulas,
  IconPessoas,
  IconPresenca,
  IconTendencia,
} from "@/components/ui/icons";
import { formatarDataExtensa } from "@/lib/format";
import type { EstatisticasDaTurma } from "@/lib/types";

type Props = {
  estatisticas: EstatisticasDaTurma;
  /** Media de engajamento das aulas COM leitura. Null = nenhuma tem. */
  engajamentoMedio: number | null;
  /** Quantas aulas entraram na media — o resto nao foi medido. */
  aulasComDados: number;
  /**
   * Engajamento por aula, do mais antigo pro mais novo — a serie que ja'
   * alimenta o grafico grande de baixo. Vira o mini-grafico do card e o selo
   * de variacao ("-61 pts"): primeira leitura contra a ultima.
   */
  serieEngajamento: number[];
};

/**
 * A fileira de numeros da tela de uma turma, como no prototipo: `auto-fit` com
 * minimo de 210px, entao a grade decide sozinha quantas colunas cabem e um
 * numero novo nao precisa de media query.
 *
 * Sao os QUATRO do prototipo. O de "Frequência" exigiu campo novo no backend
 * (`frequencia_media_pct` + `frequencia_por_aula` em `/turmas/{id}/estatisticas`,
 * 14/08): antes o dado so' existia por ALUNO dentro de `/sessoes/{id}/chamada`,
 * e montar a media no site custaria uma chamada por sessao a cada render.
 */
export function NumerosDaTurma({
  estatisticas,
  engajamentoMedio,
  aulasComDados,
  serieEngajamento,
}: Props) {
  // A API devolve "AAAA-MM-DD HH:MM:SS"; a data extensa quer so' a parte da
  // data, senao o fuso empurra pro dia anterior.
  const desde = estatisticas.primeira_sessao
    ? `desde ${formatarDataExtensa(estatisticas.primeira_sessao.slice(0, 10))}`
    : "sem aulas registradas";

  // Variacao: primeira leitura da serie contra a ultima, em PONTOS
  // percentuais (nao em % relativo — "de 82% para 21%" e' -61 pts, nao
  // "-74%"). Precisa de pelo menos 2 leituras pra significar "variou".
  const variacao =
    serieEngajamento.length >= 2
      ? Math.round(
          serieEngajamento[serieEngajamento.length - 1] - serieEngajamento[0],
        )
      : null;

  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(210px,1fr))] gap-3">
      <CartaoNumero
        rotulo="Alunos matriculados"
        valor={estatisticas.alunos_analisados}
        nota="na turma"
        cor="azul"
        icone={<IconPessoas size={21} />}
      />

      <CartaoNumero
        rotulo="Aulas monitoradas"
        valor={estatisticas.aulas_monitoradas}
        nota={desde}
        cor="verde"
        icone={<IconAulas size={21} />}
      />

      {/* Travessao, nunca "0%": zero afirmaria que ninguem prestou atencao,
          quando o fato e' que nada foi medido. */}
      <CartaoNumero
        rotulo="Engajamento médio"
        valor={engajamentoMedio === null ? "—" : `${engajamentoMedio}%`}
        nota={
          engajamentoMedio === null
            ? "nenhuma aula com leitura"
            : `atenção da turma · ${aulasComDados} ${
                aulasComDados === 1 ? "aula medida" : "aulas medidas"
              }`
        }
        cor="roxo"
        icone={<IconTendencia size={21} />}
        selo={
          variacao !== null && (
            <span
              className="rounded-full px-[7px] py-[2px] text-[10.5px] font-semibold tabular-nums whitespace-nowrap"
              style={{
                background: variacao >= 0 ? "var(--ok-bg)" : "var(--warn-bg)",
                color: variacao >= 0 ? "var(--ok-fg)" : "var(--warn-fg)",
              }}
            >
              {variacao >= 0 ? "+" : ""}
              {variacao} pts
            </span>
          )
        }
        grafico={
          serieEngajamento.length >= 2 && (
            <MiniTendencia serie={serieEngajamento} />
          )
        }
      />

      {/* FREQUENCIA — presenca COLETIVA, nunca engajamento por aluno.
          O projeto permite presenca individual (a tela de Chamada mostra por
          aluno); aqui ela vem agregada, sem RA nenhum. */}
      <CartaoNumero
        rotulo="Frequência"
        valor={
          estatisticas.frequencia_media_pct === null
            ? "—"
            : `${Math.round(estatisticas.frequencia_media_pct)}%`
        }
        nota={
          estatisticas.chamadas_registradas === 0
            ? "nenhuma chamada registrada"
            : `média · ${estatisticas.presencas_registradas} ${
                estatisticas.presencas_registradas === 1 ? "presença" : "presenças"
              } em ${estatisticas.chamadas_registradas}`
        }
        cor="verde"
        icone={<IconPresenca size={21} />}
        rodape={<Barrinhas aulas={estatisticas.frequencia_por_aula} />}
      />
    </div>
  );
}

/**
 * Uma barra por aula, da mais antiga a` mais recente (`.barrinhas`).
 *
 * Mostra as ULTIMAS 8: numa turma com 18 aulas, 18 barras de 3px viram um
 * borrao. As 8 recentes sao as que dizem algo sobre como a turma esta agora.
 *
 * A altura e' a frequencia sobre 100 (escala absoluta, nao relativa ao melhor):
 * aqui 100% e' um teto real e alcancavel — todo mundo veio —, diferente do
 * engajamento, onde o percentual conta so' quem a camera viu atento.
 */
function Barrinhas({
  aulas,
}: {
  aulas: EstatisticasDaTurma["frequencia_por_aula"];
}) {
  if (aulas.length === 0) return null;

  const ultimas = aulas.slice(-8);

  return (
    <div
      className="mt-[10px] flex h-[38px] items-end gap-[3px]"
      role="img"
      aria-label={`Frequência das últimas ${ultimas.length} ${
        ultimas.length === 1 ? "aula" : "aulas"
      }`}
    >
      {ultimas.map((aula) => (
        <span
          key={aula.sessao_id}
          title={`${Math.round(aula.frequencia_pct)}%`}
          className="flex-1 rounded-t-[3px] rounded-b-[1px] transition-opacity"
          style={{
            // `max` com 3px: aula em que ninguem veio precisa deixar rastro —
            // altura zero a apagaria do grafico como se nao existisse.
            height: `max(3px, ${aula.frequencia_pct}%)`,
            background:
              aula.frequencia_pct >= 50
                ? "var(--grafico)"
                : "var(--grafico-baixo)",
          }}
        />
      ))}
    </div>
  );
}
