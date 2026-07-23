"use client";

import Link from "next/link";
import { useState } from "react";

import { IconSeta } from "@/components/ui/icons";
import {
  formatarDataExtensa,
  formatarDiaSemana,
  formatarIntervalo,
} from "@/lib/format";
import type { AulaCard } from "@/lib/types";

type ListaAulasChamadaProps = {
  /** Aulas ja ordenadas: em andamento primeiro, depois da mais nova pra mais antiga. */
  aulas: AulaCard[];
};

/**
 * Escolha da aula para chamada.
 *
 * A aula mais relevante (em andamento, ou a mais recente) ganha um cartao
 * grande com botao direto — e' nela que o professor quase sempre clica. As
 * demais ficam guardadas num cartao recolhivel "Aulas anteriores", fora do
 * caminho mas a um clique de distancia.
 */
export function ListaAulasChamada({ aulas }: ListaAulasChamadaProps) {
  const [anterioresAbertas, setAnterioresAbertas] = useState(false);

  if (aulas.length === 0) {
    return (
      <div className="border-border-default mx-auto max-w-lg rounded-2xl border border-dashed p-10 text-center">
        <h2 className="text-text text-lg font-extrabold">
          Nenhuma aula registrada
        </h2>
        <p className="text-text-body mt-3 text-sm leading-relaxed">
          Quando a Cupcam monitorar uma aula desta turma, ela aparece aqui para
          a chamada.
        </p>
      </div>
    );
  }

  const [destaque, ...anteriores] = aulas;

  return (
    <div className="flex flex-col gap-4">
      {/* Cartao grande: a aula da vez. */}
      <div
        className="rounded-2xl p-6 sm:p-7"
        style={{
          background: "var(--surface)",
          border: "1.5px solid var(--primary)",
          boxShadow: "var(--shadow-raise)",
        }}
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p
              className="text-[11px] font-extrabold tracking-wide uppercase"
              style={{ color: "var(--text-brand)" }}
            >
              {destaque.em_andamento ? "Aula em andamento" : "Última aula"}
            </p>
            <p className="text-text mt-1.5 text-lg font-extrabold sm:text-xl">
              {formatarDiaSemana(destaque.dia_semana)},{" "}
              {formatarDataExtensa(destaque.data)}
            </p>
            <p className="text-text-muted mt-0.5 text-sm">
              {formatarIntervalo(destaque.hora_inicio, destaque.hora_fim)}
              {destaque.em_andamento && (
                <span
                  className="ml-2 rounded-full px-2.5 py-0.5 text-[11px] font-extrabold tracking-wide uppercase"
                  style={{ background: "var(--ok-bg)", color: "var(--ok-fg)" }}
                >
                  Ao vivo
                </span>
              )}
            </p>
          </div>

          <Link
            href={`/chamada/${destaque.sessao_id}`}
            className="rounded-xl px-6 py-3 text-sm font-extrabold text-white"
            style={{
              background: "var(--primary)",
              boxShadow: "var(--shadow-raise)",
            }}
          >
            Fazer chamada
          </Link>
        </div>
      </div>

      {/* Cartao recolhivel: as aulas anteriores. */}
      {anteriores.length > 0 && (
        <div
          className="overflow-hidden rounded-2xl"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            boxShadow: "var(--shadow-card)",
          }}
        >
          <button
            type="button"
            onClick={() => setAnterioresAbertas((aberto) => !aberto)}
            aria-expanded={anterioresAbertas}
            className="flex w-full items-center justify-between gap-3 px-6 py-5 text-left"
          >
            <span className="text-text text-base font-extrabold">
              Aulas anteriores
              <span className="text-text-muted ml-2 text-sm font-semibold">
                ({anteriores.length})
              </span>
            </span>
            <span
              className="text-text-muted flex-none transition-transform duration-200"
              style={{
                transform: anterioresAbertas ? "rotate(180deg)" : "none",
              }}
              aria-hidden
            >
              <IconSeta />
            </span>
          </button>

          {anterioresAbertas && (
            <ul>
              {anteriores.map((aula) => (
                <li key={aula.sessao_id}>
                  <Link
                    href={`/chamada/${aula.sessao_id}`}
                    className="hover:bg-surface-2 flex items-center gap-4 px-6 py-4 transition-colors"
                    style={{ borderTop: "1px solid var(--border)" }}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-text text-sm font-bold">
                        {formatarDiaSemana(aula.dia_semana)},{" "}
                        {formatarDataExtensa(aula.data)}
                      </p>
                      <p className="text-text-muted mt-0.5 text-[13px]">
                        {formatarIntervalo(aula.hora_inicio, aula.hora_fim)}
                      </p>
                    </div>
                    <span
                      className="flex-none -rotate-90"
                      style={{ color: "var(--text-muted)" }}
                      aria-hidden
                    >
                      <IconSeta />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
