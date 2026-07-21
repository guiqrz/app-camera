import Link from "next/link";

import { aparenciaDoStatus, formatarDataCurta } from "@/lib/format";
import type { ResumoTurma } from "@/lib/consolidar";

type GraficoTendenciaProps = {
  serie: ResumoTurma["serie"];
};

/**
 * Engajamento por aula ao longo do tempo (uma barra por aula).
 *
 * Diferente do grafico de linha do tempo (que e' minuto a minuto de UMA aula):
 * aqui cada barra e' uma aula inteira. Barras em vez de linha porque as aulas
 * sao eventos discretos, nao uma medicao continua. Cada barra leva ao
 * relatorio daquela aula.
 */
export function GraficoTendencia({ serie }: GraficoTendenciaProps) {
  if (serie.length === 0) {
    return (
      <div className="border-border-default text-text-muted flex h-56 items-center justify-center rounded-xl border border-dashed text-sm">
        Ainda não há aulas com leitura de engajamento nesta turma.
      </div>
    );
  }

  // Cor da barra pela faixa: o mesmo criterio de status do backend, mas aqui
  // derivamos da porcentagem porque a serie so' carrega o numero.
  const faixaDaBarra = (pct: number) => {
    if (pct >= 70) return aparenciaDoStatus("alto");
    if (pct >= 40) return aparenciaDoStatus("moderado");
    return aparenciaDoStatus("atencao");
  };

  return (
    <div>
      {/* Barras */}
      <div className="flex h-56 items-end gap-2 sm:gap-3">
        {serie.map((ponto) => {
          const aparencia = faixaDaBarra(ponto.engajamento);
          return (
            <Link
              key={ponto.sessaoId}
              href={`/relatorios/${ponto.sessaoId}`}
              className="group flex h-full min-w-0 flex-1 flex-col justify-end"
              title={`${formatarDataCurta(ponto.data)}: ${ponto.engajamento}% — ver relatório`}
            >
              <span
                className="text-center text-xs font-bold"
                style={{ color: aparencia.texto }}
              >
                {ponto.engajamento}%
              </span>
              <div
                className="mt-1 w-full rounded-t-md transition-opacity group-hover:opacity-80"
                style={{
                  height: `${Math.max(ponto.engajamento, 3)}%`,
                  background: aparencia.cor,
                }}
              />
            </Link>
          );
        })}
      </div>

      {/* Eixo: datas */}
      <div className="border-border-default mt-2 flex gap-2 border-t pt-2 sm:gap-3">
        {serie.map((ponto) => (
          <span
            key={ponto.sessaoId}
            className="text-text-muted min-w-0 flex-1 text-center text-[11px]"
          >
            {formatarDataCurta(ponto.data)}
          </span>
        ))}
      </div>
    </div>
  );
}
