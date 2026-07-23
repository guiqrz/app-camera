"use client";

import { IconMais, IconTurma } from "@/components/ui/icons";
import type { TurmaAdmin } from "@/lib/types";

type PainelTurmasProps = {
  turmas: TurmaAdmin[];
  selecionadaId: number | null;
  aoSelecionar: (turmaId: number) => void;
  /** Sem acao real nesta task — o botao renderiza inerte. */
  aoNovaTurma: () => void;
};

/**
 * Lista de turmas cadastradas, a coluna esquerda da tela Administracao.
 *
 * Componente burro: so' recebe dados e callbacks da vista, nao busca nem
 * grava nada sozinho.
 */
export function PainelTurmas({
  turmas,
  selecionadaId,
  aoSelecionar,
  aoNovaTurma,
}: PainelTurmasProps) {
  return (
    <div
      className="flex flex-col rounded-2xl"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        boxShadow: "var(--shadow-card)",
      }}
    >
      <div className="flex items-center justify-between gap-2 px-5 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
        <h2 className="text-text text-base font-extrabold">Turmas</h2>
        <button
          type="button"
          onClick={aoNovaTurma}
          className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-extrabold text-white"
          style={{ background: "var(--primary)" }}
        >
          <IconMais size={14} />
          Nova turma
        </button>
      </div>

      {turmas.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
          <span className="text-text-muted" aria-hidden>
            <IconTurma size={28} />
          </span>
          <p className="text-text text-sm font-bold">Nenhuma turma cadastrada ainda.</p>
          <p className="text-text-muted text-xs">
            Crie uma turma para começar a cadastrar alunos.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2 p-3">
          {turmas.map((turma) => {
            const selecionada = turma.id === selecionadaId;
            return (
              <li key={turma.id}>
                <button
                  type="button"
                  onClick={() => aoSelecionar(turma.id)}
                  aria-current={selecionada ? "true" : undefined}
                  className="flex w-full flex-col gap-1 rounded-xl px-4 py-3 text-left transition-colors"
                  style={{
                    background: selecionada ? "var(--violet-100)" : "transparent",
                    border: selecionada
                      ? "1.5px solid var(--primary)"
                      : "1.5px solid transparent",
                  }}
                >
                  <span
                    className="text-sm font-extrabold"
                    style={{ color: selecionada ? "var(--text-brand)" : "var(--text)" }}
                  >
                    {turma.nome}
                  </span>
                  <span className="text-text-muted text-xs">
                    {turma.dia_semana_nome} · {turma.hora_inicio}–{turma.hora_fim} · {turma.sala_id}
                  </span>
                  <span className="text-text-muted text-xs font-semibold">
                    {turma.total_alunos}{" "}
                    {turma.total_alunos === 1 ? "aluno matriculado" : "alunos matriculados"}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
