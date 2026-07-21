import Link from "next/link";

import { GraficoTendencia } from "@/components/relatorio/grafico-tendencia";
import {
  IconAulas,
  IconCheck,
  IconQueda,
  IconRaio,
  IconTendencia,
} from "@/components/ui/icons";
import { StatCard } from "@/components/ui/stat-card";
import {
  APARENCIA_STATUS,
  dataDoTimestamp,
  formatarDataCurta,
  formatarDataExtensa,
  formatarPct,
} from "@/lib/format";
import type { ResumoTurma } from "@/lib/consolidar";

type VistaRelatorioGeralProps = {
  resumo: ResumoTurma;
  nomeTurma: string;
};

/**
 * Relatorio geral da turma: consolida todas as aulas.
 *
 * Diferente do relatorio de UMA aula — aqui os numeros sao medias da turma e o
 * grafico e' engajamento por aula (nao minuto a minuto). Reusa os mesmos
 * cartoes e cores para manter a familia visual.
 */
export function VistaRelatorioGeral({ resumo, nomeTurma }: VistaRelatorioGeralProps) {
  const engajamento = formatarPct(resumo.engajamentoMedio);
  const periodo =
    resumo.periodo.primeira && resumo.periodo.ultima
      ? `${formatarDataExtensa(
          dataDoTimestamp(resumo.periodo.primeira),
        )} — ${formatarDataExtensa(dataDoTimestamp(resumo.periodo.ultima))}`
      : "Sem aulas registradas";

  return (
    <div className="flex flex-col gap-7">
      <div>
        <h1
          className="text-text text-2xl font-extrabold sm:text-3xl"
          style={{ fontFamily: "var(--font-geologica)" }}
        >
          Relatório geral · {nomeTurma}
        </h1>
        <p className="text-text-body mt-1.5 text-sm">
          Visão consolidada de todas as aulas monitoradas. {periodo}.
        </p>
      </div>

      {/* Cinco cartoes de resumo, lado a lado como o relatorio de aula. */}
      <div className="grid grid-cols-1 gap-4 min-[560px]:auto-cols-fr min-[560px]:grid-flow-col min-[560px]:overflow-x-auto min-[560px]:[&>*]:min-w-[190px] xl:min-w-0 xl:[&>*]:min-w-0">
        <StatCard
          rotulo="Engajamento médio"
          valor={engajamento ?? "Sem dados"}
          apoio={`Média de ${resumo.aulasComDados} aula(s)`}
          icone={
            <span style={{ color: "var(--primary)" }}>
              <IconTendencia />
            </span>
          }
        />
        <StatCard
          rotulo="Melhor aula"
          valor={
            resumo.melhorAula
              ? `${resumo.melhorAula.engajamento_pct}%`
              : "—"
          }
          apoio={
            resumo.melhorAula
              ? formatarDataCurta(resumo.melhorAula.data)
              : "Sem leitura"
          }
          icone={
            <span style={{ color: "var(--ok-fg)" }}>
              <IconRaio />
            </span>
          }
        />
        <StatCard
          rotulo="Aula mais fraca"
          valor={resumo.piorAula ? `${resumo.piorAula.engajamento_pct}%` : "—"}
          apoio={
            resumo.piorAula ? formatarDataCurta(resumo.piorAula.data) : "Sem leitura"
          }
          icone={
            <span style={{ color: "var(--danger-fg)" }}>
              <IconQueda />
            </span>
          }
        />
        <StatCard
          rotulo="Aulas monitoradas"
          valor={resumo.totalAulas}
          apoio={`${resumo.aulasComDados} com leitura`}
          icone={
            <span style={{ color: "var(--primary)" }}>
              <IconAulas />
            </span>
          }
        />
        <StatCard
          variante="brand"
          rotulo="Alunos analisados"
          valor={resumo.alunosAnalisados}
          apoio="Matriculados na turma"
          icone={<IconCheck />}
        />
      </div>

      {/* Grafico de tendencia + distribuicao */}
      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="border-border-default bg-surface shadow-card flex flex-col rounded-2xl border p-5 sm:p-6">
          <div className="mb-4">
            <h2 className="text-text text-lg font-extrabold">
              Engajamento por aula
            </h2>
            <p className="text-text-muted text-sm">
              Evolução do foco da turma ao longo das aulas. Clique numa barra
              para ver o relatório da aula.
            </p>
          </div>
          <GraficoTendencia serie={resumo.serie} />
        </div>

        <div className="border-border-default bg-surface shadow-card flex flex-col rounded-2xl border p-5">
          <h3 className="text-text mb-4 text-base font-extrabold">
            Distribuição das aulas
          </h3>
          <div className="flex flex-col gap-4">
            {(["alto", "moderado", "atencao"] as const).map((faixa) => {
              const qtd = resumo.distribuicao[faixa];
              const pct =
                resumo.totalAulas > 0
                  ? Math.round((qtd / resumo.totalAulas) * 100)
                  : 0;
              const aparencia = APARENCIA_STATUS[faixa];

              return (
                <div key={faixa}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="text-text-body flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ background: aparencia.cor }}
                        aria-hidden
                      />
                      {aparencia.rotulo}
                    </span>
                    <span className="text-text font-bold">{qtd}</span>
                  </div>
                  <div
                    className="h-2 overflow-hidden rounded-full"
                    style={{ background: "var(--surface-2)" }}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${pct}%`, background: aparencia.cor }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <Link
            href="/aulas"
            className="text-text-brand border-border-default hover:bg-surface-2 mt-6 flex items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-bold transition-colors"
          >
            Ver todas as aulas
          </Link>
        </div>
      </div>
    </div>
  );
}
