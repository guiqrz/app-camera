import type { FaixaDeTempo, TempoDaAula, TempoDaTurma } from "@/lib/types";

/**
 * Feature F1 — em que o tempo da aula foi gasto.
 *
 * POR QUE ISTO SUBSTITUI A NOTA DE ENGAJAMENTO
 * --------------------------------------------
 * "A turma esteve 72% engajada" nao diz o que fazer. "Dos seus 50 minutos, 34
 * foram conteudo, 11 foram recolocar ordem e 5 foram burocracia" diz.
 *
 * TALIS 2024 mediu no Brasil 67% conteudo / 20-21% ordem / 13% burocracia, e
 * nenhum concorrente mede isso: gestao escolar mede nota, presenca e
 * mensalidade. E' o angulo mais defensavel do produto — e nao identifica
 * ninguem, porque o eixo aqui e' o TEMPO, nao a pessoa.
 */

/** Rotulo e cor de cada faixa. Ordem fixa: e' a leitura da esquerda pra direita. */
const FAIXAS: {
  id: FaixaDeTempo;
  rotulo: string;
  cor: string;
  explicacao: string;
}[] = [
  {
    id: "conteudo",
    rotulo: "Conteúdo",
    cor: "var(--ok)",
    explicacao: "Turma acompanhando a aula.",
  },
  {
    id: "ordem",
    rotulo: "Ordem",
    cor: "var(--warn)",
    explicacao: "Dispersão coletiva — tempo gasto recolocando a turma na aula.",
  },
  {
    id: "burocracia",
    rotulo: "Burocracia",
    cor: "var(--text-muted)",
    explicacao: "Chamada e registro.",
  },
];

function formatarMinutos(minutos: number): string {
  if (minutos < 1) return "menos de 1 min";
  return `${Math.round(minutos)} min`;
}

/**
 * O estado "a aula nao foi observada".
 *
 * Existe como componente proprio porque a alternativa é a armadilha desta
 * feature: uma aula sem leitura nenhuma renderizada como barra vazia lê como
 * "0% de dispersão", que é elogio a uma aula que o sistema nunca viu.
 */
function SemObservacao({ contexto }: { contexto: string }) {
  return (
    <div
      className="rounded-2xl border border-dashed p-5 text-center"
      style={{ borderColor: "var(--border)" }}
    >
      <p className="text-[13px]" style={{ color: "var(--text-muted)" }}>
        {contexto}
      </p>
    </div>
  );
}

/** A barra de tres faixas de UMA aula. */
export function BarraTempoAula({ tempo }: { tempo: TempoDaAula }) {
  if (!tempo.observado) {
    return (
      <SemObservacao contexto="A câmera não fez leitura útil nesta aula, então não dá para repartir o tempo. Sala vazia ou câmera desligada." />
    );
  }

  return (
    <div>
      {/* A barra. `flex` com largura proporcional em vez de grid: as faixas
          somam 100% e uma faixa de 0% precisa sumir de verdade, sem deixar
          fresta de 1px que leria como "um pouquinho". */}
      <div
        className="flex h-3 w-full overflow-hidden rounded-full"
        style={{ background: "var(--surface-2)" }}
        role="img"
        aria-label={FAIXAS.map(
          (faixa) =>
            `${faixa.rotulo}: ${formatarMinutos(tempo.faixas[faixa.id])}`,
        ).join(", ")}
      >
        {FAIXAS.map((faixa) => {
          const pct = tempo.percentuais[faixa.id];
          if (pct <= 0) return null;
          return (
            <div
              key={faixa.id}
              style={{ width: `${pct}%`, background: faixa.cor }}
            />
          );
        })}
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-3">
        {FAIXAS.map((faixa) => (
          <div key={faixa.id}>
            <dt className="flex items-center gap-1.5">
              <span
                className="h-2 w-2 flex-none rounded-full"
                style={{ background: faixa.cor }}
                aria-hidden
              />
              <span
                className="text-[11px] font-semibold tracking-wide uppercase"
                style={{ color: "var(--text-muted)" }}
              >
                {faixa.rotulo}
              </span>
            </dt>
            <dd
              className="mt-1 text-xl font-semibold"
              style={{ color: "var(--text)" }}
            >
              {formatarMinutos(tempo.faixas[faixa.id])}
            </dd>
            <dd
              className="text-[12px] leading-snug"
              style={{ color: "var(--text-muted)" }}
            >
              {tempo.percentuais[faixa.id]}% da aula
            </dd>
          </div>
        ))}
      </dl>

      <p
        className="mt-4 text-[12px] leading-relaxed"
        style={{ color: "var(--text-muted)" }}
      >
        Aula de {formatarMinutos(tempo.duracao_min)}. A leitura é coletiva: o
        eixo é o tempo da turma, nunca o comportamento de um aluno.
      </p>
    </div>
  );
}

/**
 * A tendencia das ultimas aulas da turma.
 *
 * O valor da F1 esta na SERIE, nao numa aula isolada: "voce recuperou 11
 * minutos de conteudo esta semana" e' o que muda comportamento. Uma aula ruim
 * isolada e' ruido; tres seguidas sao um padrao.
 */
export function TendenciaTempoTurma({ tempo }: { tempo: TempoDaTurma }) {
  if (tempo.media === null) {
    return (
      <SemObservacao contexto="Nenhuma aula desta turma teve leitura útil da câmera ainda. A tendência aparece quando houver." />
    );
  }

  const observadas = tempo.aulas.filter((aula) => aula.observado);

  return (
    <div>
      <dl className="grid grid-cols-3 gap-3">
        {FAIXAS.map((faixa) => (
          <div
            key={faixa.id}
            className="rounded-2xl p-4"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
            }}
          >
            <dt className="flex items-center gap-1.5">
              <span
                className="h-2 w-2 flex-none rounded-full"
                style={{ background: faixa.cor }}
                aria-hidden
              />
              <span
                className="text-[11px] font-semibold tracking-wide uppercase"
                style={{ color: "var(--text-muted)" }}
              >
                {faixa.rotulo}
              </span>
            </dt>
            <dd
              className="mt-2 text-2xl font-semibold"
              style={{ color: "var(--text)" }}
            >
              {tempo.media![faixa.id]}%
            </dd>
            <dd
              className="mt-1 text-[12px] leading-snug"
              style={{ color: "var(--text-muted)" }}
            >
              {faixa.explicacao}
            </dd>
          </div>
        ))}
      </dl>

      {/* As barrinhas por aula, da mais antiga pra mais nova. Sem eixo nem
          rotulo de data: aqui o que importa e' a FORMA da serie — se a faixa
          amarela vem crescendo —, nao ler o valor de cada dia. */}
      {observadas.length > 1 && (
        <div className="mt-5">
          <p
            className="mb-2 text-[11px] font-semibold tracking-wide uppercase"
            style={{ color: "var(--text-muted)" }}
          >
            Últimas {observadas.length} aulas observadas
          </p>
          <div className="flex items-end gap-1.5">
            {observadas.map((aula) =>
              aula.observado ? (
                <div
                  key={aula.sessao_id}
                  className="flex h-16 flex-1 flex-col-reverse overflow-hidden rounded"
                  title={`${aula.percentuais.conteudo}% conteúdo`}
                >
                  {FAIXAS.map((faixa) => (
                    <div
                      key={faixa.id}
                      style={{
                        height: `${aula.percentuais[faixa.id]}%`,
                        background: faixa.cor,
                      }}
                    />
                  ))}
                </div>
              ) : null,
            )}
          </div>
        </div>
      )}

      <p
        className="mt-4 text-[12px] leading-relaxed"
        style={{ color: "var(--text-muted)" }}
      >
        Média de {tempo.aulas_observadas}{" "}
        {tempo.aulas_observadas === 1 ? "aula observada" : "aulas observadas"}.
        Para referência, a média brasileira medida pelo TALIS 2024 é 67%
        conteúdo, 21% ordem e 13% burocracia.
      </p>
    </div>
  );
}
