"use client";

import { IconLapis, IconLixeira, IconMais, IconTurma } from "@/components/ui/icons";
import type { TurmaAdmin } from "@/lib/types";

type PainelTurmasProps = {
  turmas: TurmaAdmin[];
  selecionadaId: number | null;
  aoSelecionar: (turmaId: number) => void;
  aoNovaTurma: () => void;
  aoEditarTurma: (turma: TurmaAdmin) => void;
  aoExcluirTurma: (turma: TurmaAdmin) => void;
};

/**
 * Lista de turmas cadastradas, a coluna esquerda da tela Administracao.
 *
 * Componente burro: so' recebe dados e callbacks da vista, nao busca nem
 * grava nada sozinho. Cada turma seleciona ao clicar e traz dois botoes de
 * acao (editar/excluir) que a vista abre em modal.
 */
export function PainelTurmas({
  turmas,
  selecionadaId,
  aoSelecionar,
  aoNovaTurma,
  aoEditarTurma,
  aoExcluirTurma,
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
              <li
                key={turma.id}
                className="flex items-stretch gap-1 rounded-xl transition-colors"
                style={{
                  background: selecionada ? "var(--violet-100)" : "transparent",
                  border: selecionada
                    ? "1.5px solid var(--primary)"
                    : "1.5px solid transparent",
                }}
              >
                {/* Selecionar a turma — botao principal, ocupa a linha toda. */}
                <button
                  type="button"
                  onClick={() => aoSelecionar(turma.id)}
                  aria-current={selecionada ? "true" : undefined}
                  className="flex min-w-0 flex-1 flex-col gap-1 rounded-l-xl px-4 py-3 text-left"
                >
                  <span
                    className="truncate text-sm font-extrabold"
                    style={{ color: selecionada ? "var(--text-brand)" : "var(--text)" }}
                  >
                    {turma.nome}
                  </span>
                  <span className="text-text-muted truncate text-xs">
                    {turma.dia_semana_nome} · {turma.hora_inicio}–{turma.hora_fim} · {turma.sala_id}
                  </span>
                  <span className="text-text-muted text-xs font-semibold">
                    {turma.total_alunos}{" "}
                    {turma.total_alunos === 1 ? "aluno matriculado" : "alunos matriculados"}
                  </span>
                </button>

                {/* Acoes da turma — fora do botao de selecao (botao dentro de
                    botao e' HTML invalido). */}
                <div className="flex flex-none items-center gap-0.5 pr-2">
                  <button
                    type="button"
                    onClick={() => aoEditarTurma(turma)}
                    aria-label={`Editar turma ${turma.nome}`}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
                    style={{ color: "var(--text-muted)" }}
                  >
                    <IconLapis />
                  </button>
                  <button
                    type="button"
                    onClick={() => aoExcluirTurma(turma)}
                    aria-label={`Excluir turma ${turma.nome}`}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
                    style={{ color: "var(--danger)" }}
                  >
                    <IconLixeira />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
