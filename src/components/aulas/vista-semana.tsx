import Link from "next/link";

import {
  IconAlerta,
  IconCalendario,
  IconCheck,
  IconClipe,
} from "@/components/ui/icons";
import { formatarIntervalo } from "@/lib/format";
import type { AulaDaSemana, PreparacaoDaSemana } from "@/lib/types";

/**
 * Feature F12 — a preparacao da semana.
 *
 * POR QUE ESTA TELA EXISTE
 * ------------------------
 * O professor brasileiro gasta 9,3 h/semana preparando aula — 2,2 h a mais que
 * em 2018, e acima da media da OCDE (7,4 h). Boa parte disso nao e' preparar:
 * e' RECONSTRUIR CONTEXTO, abrindo quatro lugares pra lembrar onde parou em
 * cada turma.
 *
 * Esta tela responde "o que me espera" de uma vez.
 *
 * A PENDENCIA E' O CONTEUDO PRINCIPAL, NAO UM DETALHE
 * ---------------------------------------------------
 * "Quarta, 9ª B: você planejou exercício de revisão e não tem material
 * anexado" e' o unico item aqui que muda o que ele faz hoje a noite. Por isso
 * as pendencias vem em bloco proprio no topo, antes da grade da semana.
 */

const ESTILO_CARTAO = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  boxShadow: "var(--shadow-card)",
} as const;

/** Uma aula na lista do dia. */
function LinhaAula({ aula }: { aula: AulaDaSemana }) {
  return (
    <li
      className="flex flex-wrap items-center gap-3 rounded-xl px-3.5 py-2.5"
      style={{
        background: aula.falta_material
          ? "var(--warn-bg)"
          : "var(--surface-2)",
      }}
    >
      <span
        className="flex-none text-[12px] font-semibold tabular-nums"
        style={{ color: "var(--text-muted)" }}
      >
        {formatarIntervalo(aula.hora_inicio, aula.hora_fim)}
      </span>

      <span
        className="min-w-0 flex-1 text-[13.5px] font-semibold"
        style={{ color: "var(--text)" }}
      >
        {aula.turma}
        {aula.materia && (
          <span className="font-normal" style={{ color: "var(--text-muted)" }}>
            {" · "}
            {aula.materia}
          </span>
        )}
      </span>

      {/* O conteúdo previsto vem do cronograma (F9). Sem cronograma ele é
          null, e a linha simplesmente não o mostra — a ausência aqui não é
          pendência, é uma turma que ainda não planejou o bimestre. */}
      {aula.conteudo_previsto && (
        <span
          className="min-w-0 basis-full text-[12.5px] sm:basis-auto"
          style={{ color: "var(--text-body)" }}
        >
          {aula.conteudo_previsto}
        </span>
      )}

      {aula.falta_material ? (
        <span
          className="flex flex-none items-center gap-1.5 text-[12px] font-semibold"
          style={{ color: "var(--warn-fg)" }}
        >
          <IconAlerta size={12} />
          falta material
        </span>
      ) : (
        (aula.anexos > 0 || aula.tem_plano) && (
          <span
            className="flex flex-none items-center gap-1.5 text-[12px]"
            style={{ color: "var(--text-muted)" }}
          >
            <IconClipe size={12} />
            {aula.anexos > 0
              ? `${aula.anexos} ${aula.anexos === 1 ? "anexo" : "anexos"}`
              : "plano escrito"}
          </span>
        )
      )}
    </li>
  );
}

export function VistaSemana({ semana }: { semana: PreparacaoDaSemana }) {
  const diasComAula = semana.dias.filter((dia) => dia.aulas.length > 0);

  if (semana.total_de_aulas === 0) {
    return (
      <div
        className="border-border-default mx-auto max-w-lg rounded-2xl border border-dashed p-10 text-center"
      >
        <h2 className="text-text text-xl font-semibold">
          Nenhuma aula nesta semana
        </h2>
        <p
          className="mt-3 text-sm leading-relaxed"
          style={{ color: "var(--text-body)" }}
        >
          Não há aula na grade entre {semana.inicio} e {semana.fim}. Semana de
          recesso, ou a grade ainda não foi montada.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-[13px]">
      {/* --- As pendências, primeiro: é o que muda o que ele faz hoje. --- */}
      <section className="rounded-2xl p-5" style={ESTILO_CARTAO}>
        <div className="flex flex-wrap items-center gap-3">
          <span
            style={{
              width: 34,
              height: 34,
              flex: "none",
              borderRadius: 10,
              background:
                semana.aulas_sem_material > 0
                  ? "var(--warn-bg)"
                  : "var(--ok-bg)",
              color:
                semana.aulas_sem_material > 0
                  ? "var(--warn-fg)"
                  : "var(--ok-fg)",
              display: "grid",
              placeItems: "center",
            }}
            aria-hidden
          >
            {semana.aulas_sem_material > 0 ? (
              <IconAlerta size={16} />
            ) : (
              <IconCheck size={16} />
            )}
          </span>

          <div className="min-w-0 flex-1">
            {semana.aulas_sem_material > 0 ? (
              <>
                <p
                  className="text-[13.5px] font-semibold"
                  style={{ color: "var(--text)" }}
                >
                  {semana.aulas_sem_material}{" "}
                  {semana.aulas_sem_material === 1
                    ? "aula prevê conteúdo e não tem material"
                    : "aulas preveem conteúdo e não têm material"}
                  .
                </p>
                <p
                  className="mt-0.5 text-[12.5px]"
                  style={{ color: "var(--text-muted)" }}
                >
                  De {semana.total_de_aulas}{" "}
                  {semana.total_de_aulas === 1 ? "aula" : "aulas"} na semana.
                </p>
              </>
            ) : (
              <p
                className="text-[13.5px] font-semibold"
                style={{ color: "var(--text)" }}
              >
                Suas {semana.total_de_aulas} aulas da semana estão preparadas.
              </p>
            )}
          </div>
        </div>

        {semana.pendencias.length > 0 && (
          <ul className="mt-4 flex flex-col gap-2">
            {semana.pendencias.map((aula) => (
              <li key={aula.aula_id}>
                <Link
                  href={`/aulas/${aula.turma_id}`}
                  className="flex flex-wrap items-center gap-3 rounded-xl px-3.5 py-2.5 transition-transform hover:-translate-y-px"
                  style={{ background: "var(--warn-bg)" }}
                >
                  <span
                    className="min-w-0 flex-1 text-[13px]"
                    style={{ color: "var(--warn-fg)" }}
                  >
                    <strong>{aula.turma}</strong>
                    {aula.conteudo_previsto && ` · ${aula.conteudo_previsto}`}
                  </span>
                  <span
                    className="flex-none text-[12px] tabular-nums"
                    style={{ color: "var(--warn-fg)" }}
                  >
                    {formatarIntervalo(aula.hora_inicio, aula.hora_fim)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* --- A semana, dia a dia. --- */}
      {diasComAula.map((dia) => (
        <section
          key={dia.data}
          className="rounded-2xl p-5"
          style={
            dia.e_hoje
              ? {
                  ...ESTILO_CARTAO,
                  borderColor: "var(--primary)",
                }
              : ESTILO_CARTAO
          }
        >
          <div className="mb-3 flex items-center gap-2">
            <IconCalendario size={14} className="opacity-60" />
            <h2
              className="text-[11px] font-semibold tracking-wide uppercase"
              style={{ color: dia.e_hoje ? "var(--text-brand)" : "var(--text-muted)" }}
            >
              {dia.rotulo}
              {dia.e_hoje && " · hoje"}
            </h2>
          </div>

          <ul className="flex flex-col gap-2">
            {dia.aulas.map((aula) => (
              <LinhaAula key={aula.aula_id} aula={aula} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
