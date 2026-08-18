import type { AulasPorMateria } from "@/lib/types";

/**
 * Sequencia fixa das cores de serie.
 *
 * A ORDEM e' a de --grafico-* em semantic.css e nao pode ser reordenada: ela
 * separa o par roxo/azul, que adjacente da ΔE 1,9 sob deuteranopia (a MESMA
 * cor pro daltonismo mais comum). Validada com o script da skill dataviz.
 *
 * Cores sao atribuidas por POSICAO na lista, nunca cicladas: uma 5a materia
 * nao ganha uma cor gerada — ela cai no neutro, junto do "sem materia".
 */
const CORES = [
  "var(--grafico-azul)",
  "var(--grafico-ambar)",
  "var(--grafico-roxo)",
  "var(--grafico-verde)",
];

const NEUTRO = "var(--grafico-neutro)";

/** Rotulo que o backend usa pras sessoes sem aula da grade vinculada. */
const SEM_MATERIA = "sem materia";

function corDaFatia(materia: string, indice: number) {
  // "sem materia" e' ausencia de identidade: sempre neutro, nunca uma cor de
  // serie. Ele nao concorre por um slot da paleta.
  if (materia === SEM_MATERIA) return NEUTRO;
  return CORES[indice] ?? NEUTRO;
}

function rotuloDaFatia(materia: string) {
  return materia === SEM_MATERIA ? "Sem matéria" : materia;
}

type Props = {
  aulasPorMateria: AulasPorMateria[];
  total: number;
  /** Linha de apoio sob o titulo ("em 5 turmas · 4 matérias"). */
  nota: string;
};

/**
 * Card "Aulas analisadas" — donut de materias + legenda ao lado.
 *
 * O anel e' um `conic-gradient` mascarado (a mascara radial abre o furo em
 * 62%/63%), exatamente como no prototipo: nao ha SVG nem biblioteca de
 * grafico envolvida.
 *
 * A identidade nunca depende so' da cor: cada fatia aparece na legenda com
 * rotulo de texto e contagem ao lado do ponto colorido, entao a leitura
 * sobrevive ao daltonismo e ao `forced-colors`. O `role="img"` com
 * `aria-label` descreve a distribuicao inteira pra quem usa leitor de tela.
 */
export function DistribuicaoMaterias({ aulasPorMateria, total, nota }: Props) {
  if (total === 0 || aulasPorMateria.length === 0) {
    return (
      <div
        className="border-border-default bg-surface flex min-h-[178px] flex-col rounded-[12px] border px-[18px] pt-[17px] pb-[16px]"
        style={{ backdropFilter: "var(--blur-card)" }}
      >
        <div className="text-text-body text-[13px] font-semibold">
          Aulas analisadas
        </div>
        <p className="text-text-muted mt-[5px] text-[12px]">
          Nenhuma aula monitorada ainda.
        </p>
      </div>
    );
  }

  // Materias reais primeiro na atribuicao de cor: "sem materia" nao pode
  // "gastar" o azul e empurrar Biologia pro ambar. O indice da paleta vem da
  // posicao DENTRE AS REAIS, calculada por filtro — nao de um contador
  // mutavel, que o lint (com razao) le' como reatribuicao apos o render.
  const reais = aulasPorMateria.filter((l) => l.materia !== SEM_MATERIA);
  const fatias = aulasPorMateria.map((linha) => ({
    ...linha,
    cor:
      linha.materia === SEM_MATERIA
        ? NEUTRO
        : corDaFatia(
            linha.materia,
            reais.findIndex((l) => l.materia === linha.materia),
          ),
  }));

  // Paradas em GRAUS, acumuladas: cada fatia vai de onde a anterior parou ate
  // a sua propria fronteira. O acumulado sai de `reduce` e nao de uma variavel
  // mutavel — o fim de uma fatia TEM que ser o inicio da proxima, senao sobra
  // fresta de arredondamento entre elas.
  const paradas = fatias.reduce<{ deg: number; css: string[] }>(
    (acumulado, fatia) => {
      const fim = acumulado.deg + (360 * fatia.total) / total;
      acumulado.css.push(
        `${fatia.cor} ${acumulado.deg.toFixed(1)}deg ${fim.toFixed(1)}deg`,
      );
      return { deg: fim, css: acumulado.css };
    },
    { deg: 0, css: [] },
  ).css;

  return (
    <div
      className="border-border-default bg-surface flex min-h-[178px] flex-row items-center gap-4 rounded-[12px] border px-[18px] pt-[17px] pb-[16px]"
      style={{ backdropFilter: "var(--blur-card)" }}
    >
      <div className="relative grid h-24 w-24 flex-none place-items-center">
        <span
          className="absolute inset-0 rounded-full"
          style={{
            background: `conic-gradient(from -90deg, ${paradas.join(", ")})`,
            // O furo do meio: a mascara deixa passar so' o anel.
            mask: "radial-gradient(circle, transparent 62%, #000 63%)",
          }}
          role="img"
          aria-label={`Distribuição das aulas: ${fatias
            .map((f) => `${rotuloDaFatia(f.materia)}, ${f.total}`)
            .join("; ")}`}
        />
        <span
          className="text-text block text-[30px] tabular-nums"
          style={{ fontWeight: 300, letterSpacing: "-0.035em", lineHeight: 1 }}
        >
          {total}
        </span>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-[2px]">
        <div className="text-text-body text-[13px] font-semibold leading-[1.25]">
          Aulas analisadas
        </div>
        <div className="text-text-muted text-[12px]">{nota}</div>

        <div className="mt-2 flex flex-col gap-[3px]">
          {fatias.map((fatia) => (
            <span
              key={fatia.materia}
              className="text-text-muted flex items-center gap-[6px] overflow-hidden text-[11.5px] leading-[1.5] text-ellipsis whitespace-nowrap"
              style={{ fontWeight: 550 }}
            >
              <span
                className="h-[7px] w-[7px] flex-none rounded-full"
                style={{ background: fatia.cor }}
                aria-hidden
              />
              {rotuloDaFatia(fatia.materia)}
              <b
                className="ml-auto tabular-nums"
                style={{ fontWeight: 650 }}
              >
                {fatia.total}
              </b>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
