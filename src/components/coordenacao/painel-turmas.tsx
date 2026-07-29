"use client";

import { BotaoIcone } from "@/components/ui/botao-icone";
import { IconLapis, IconLixeira, IconMais, IconTurma } from "@/components/ui/icons";
import type { TurmaAdmin } from "@/lib/types";

type PainelTurmasProps = {
  turmas: TurmaAdmin[];
  selecionadaId: number | null;
  aoSelecionar: (turmaId: number) => void;
  aoNovaTurma: () => void;
  aoExcluirTurma: (turma: TurmaAdmin) => void;
};

/**
 * Lista de turmas cadastradas, a coluna esquerda da tela Coordenacao.
 *
 * Componente burro: so' recebe dados e callbacks da vista, nao busca nem
 * grava nada sozinho. Cada turma seleciona ao clicar e traz duas acoes.
 *
 * Editar e' um LINK, nao um callback: a edicao virou pagina propria
 * (`/coordenacao/turmas/{id}`), onde a turma aparece junto da grade semanal de
 * aulas. Como link de verdade, ganha de graca o "abrir em nova aba" e o
 * prefetch do Next — que um botao com router.push nao daria.
 */
export function PainelTurmas({
  turmas,
  selecionadaId,
  aoSelecionar,
  aoNovaTurma,
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
                  {/* Turma e' so' identidade: nome + sala. Dia e horario agora
                      vivem nas aulas dela, no painel "Aulas da turma". */}
                  <span className="text-text-muted truncate text-xs">{turma.sala_id}</span>
                  <span className="text-text-muted text-xs font-semibold">
                    {turma.total_alunos}{" "}
                    {turma.total_alunos === 1 ? "aluno matriculado" : "alunos matriculados"}
                  </span>
                </button>

                {/* Acoes da turma — fora do botao de selecao (link ou botao
                    dentro de botao e' HTML invalido). */}
                {/* gap-3 (12px) e nao gap-0.5: os botoes medem 32px e a area de
                    toque vai a 44, entao precisam de 12px entre si para uma nao
                    cobrir a outra. */}
                <div className="flex flex-none items-center gap-3 pr-2">
                  <BotaoIcone
                    como="link"
                    href={`/coordenacao/turmas/${turma.id}`}
                    rotulo={`Editar turma ${turma.nome} e sua grade de aulas`}
                    tamanho={32}
                    cor="var(--text-muted)"
                  >
                    <IconLapis />
                  </BotaoIcone>
                  <BotaoIcone
                    rotulo={`Excluir turma ${turma.nome}`}
                    aoClicar={() => aoExcluirTurma(turma)}
                    tamanho={32}
                    cor="var(--danger)"
                  >
                    <IconLixeira />
                  </BotaoIcone>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
