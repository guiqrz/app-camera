"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import type { ResumoTurma } from "@/lib/consolidar";

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

/**
 * "AAAA-MM-DD" -> "6/8". Fatia a string em vez de usar `new Date`.
 *
 * `new Date("2026-08-06")` e' meia-noite UTC e, no fuso do Brasil (-03), volta
 * pro dia 5 — o rotulo mostraria a data errada em metade do dia.
 */
function rotuloCurto(iso: string) {
  const [, mes, dia] = iso.split("-");
  return `${Number(dia)}/${Number(mes)}`;
}

function chaveDoMes(iso: string) {
  return iso.slice(0, 7);
}

function nomeDoMes(chave: string) {
  const [, mes] = chave.split("-");
  return MESES[Number(mes) - 1] ?? chave;
}

type Props = {
  serie: ResumoTurma["serie"];
  turmaId: number;
};

/**
 * "Engajamento das últimas aulas" — o card `.card` + `.gr` do prototipo.
 *
 * A barra e' comparada com a MELHOR AULA DO MES exibido, nao com 100%: com
 * escala absoluta, uma turma que roda a 30% desenha seis barrinhas rentes ao
 * chao e o grafico nao mostra variacao nenhuma. Relativo ao melhor do periodo,
 * a forma responde "esta aula foi melhor ou pior que as outras?", que e' a
 * pergunta real. O numero exato fica no balao de hover, sem arredondar nada.
 */
export function EngajamentoDaTurma({ serie, turmaId }: Props) {
  const meses = useMemo(
    () => [...new Set(serie.map((p) => chaveDoMes(p.data)))].sort().reverse(),
    [serie],
  );

  // Abre no mes mais recente COM dado, e nao no mes corrente: numa turma que
  // parou em julho, "Agosto" abriria o card vazio.
  const [mes, setMes] = useState(() => meses[0] ?? "");

  const pontos = useMemo(
    () => serie.filter((p) => chaveDoMes(p.data) === mes),
    [serie, mes],
  );

  // O teto da escala. `|| 1` evita divisao por zero quando todas as leituras
  // do mes sao 0% — ai toda barra fica no minimo visivel, que e' o correto.
  const teto = Math.max(...pontos.map((p) => p.engajamento), 1);

  if (serie.length === 0) return null;

  return (
    <section
      className="bg-surface border-border-default overflow-hidden rounded-[12px] border"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      {/* `.card-topo.com-nota`: o titulo e a nota formam uma coluna, e o
          filtro de mes ancora na direita. A nota vem ANTES das barras porque
          e' ela que explica o que o numero significa. */}
      <div className="flex flex-wrap items-start gap-[10px] px-[17px] pt-[15px] pb-[11px]">
        <div className="min-w-0 flex-1">
          <h2
            className="text-text text-[16px] font-semibold"
            style={{ letterSpacing: "-0.16px" }}
          >
            Engajamento das últimas aulas
          </h2>
          <p
            className="text-text-muted mt-[6px] text-[12.5px] leading-[1.5]"
            style={{ fontWeight: 400 }}
          >
            Tempo em que a turma esteve atenta, comparado à melhor aula do mês
            {teto > 0 && ` (${teto}%)`}. É sempre um número do grupo — a Cupcam
            não mede engajamento de aluno.
          </p>
        </div>

        {/* Aparece so' quando ha mais de um mes: um seletor de uma opcao so'
            e' um botao que nao faz nada. */}
        {meses.length > 1 && (
          <label className="ml-auto flex-none">
            <span className="sr-only">Filtrar por mês</span>
            <select
              value={mes}
              onChange={(evento) => setMes(evento.target.value)}
              className="border-border-default bg-surface-2 text-text-body cursor-pointer appearance-none rounded-full border py-[5px] pr-[11px] pl-[11px] text-[11.5px]"
              style={{ fontWeight: 550 }}
            >
              {meses.map((chave) => (
                <option key={chave} value={chave}>
                  {nomeDoMes(chave)}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <div className="px-[17px] pt-[6px] pb-[16px]">
        {pontos.length === 0 ? (
          <p className="text-text-muted py-8 text-center text-[13px]">
            Nenhuma aula com leitura de engajamento em {nomeDoMes(mes)}.
          </p>
        ) : (
          <div className="flex h-[132px] items-end gap-[10px] pt-[22px]">
            {pontos.map((ponto) => (
              <Link
                key={ponto.sessaoId}
                href={`/relatorios/sessao/${ponto.sessaoId}?turma=${turmaId}`}
                className="group relative flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-[7px]"
                title={`${rotuloCurto(ponto.data)}: ${ponto.engajamento}% — ver relatório`}
              >
                {/* Balao so' no hover, como na referencia: com o numero
                    sempre visivel em cima de cada barra, seis rotulos
                    competem com as proprias barras pela leitura. */}
                <span
                  className="text-bg pointer-events-none absolute -top-[4px] left-1/2 z-10 -translate-x-1/2 translate-y-[4px] rounded-[6px] px-2 py-[3px] text-[10.5px] font-semibold tabular-nums opacity-0 transition-[opacity,transform] group-hover:translate-y-0 group-hover:opacity-100"
                  style={{ background: "var(--text)", color: "var(--bg)" }}
                >
                  {ponto.engajamento}%
                </span>

                <span
                  className="w-full rounded-t-[7px] rounded-b-[3px] transition-[filter] group-hover:brightness-110"
                  style={{
                    // `max` com 4px: uma aula de 0% precisa deixar RASTRO —
                    // barra de altura zero some e a aula desaparece do
                    // grafico como se nunca tivesse existido.
                    height: `max(4px, ${(ponto.engajamento / teto) * 100}%)`,
                    background:
                      ponto.engajamento >= teto * 0.5
                        ? "var(--grafico)"
                        : "var(--grafico-baixo)",
                  }}
                />
                <span className="text-text-muted text-[11px] tabular-nums">
                  {rotuloCurto(ponto.data)}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
