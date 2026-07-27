"use client";

import { useMemo, useState } from "react";

import {
  IconCalendario,
  IconCheck,
  IconFechar,
  IconLapis,
  IconLixeira,
  IconMais,
} from "@/components/ui/icons";
import { formatarDiaSemana } from "@/lib/format";
import type { Aula, TurmaAdmin } from "@/lib/types";

type PainelAulasProps = {
  /** Turma selecionada no painel esquerdo. Nulo quando nao ha turma nenhuma. */
  turma: TurmaAdmin | null;
  /** Aulas da turma selecionada (a vista faz o recorte e a busca). */
  aulas: Aula[];
  /** true enquanto a lista de aulas da turma esta sendo buscada. */
  carregando?: boolean;
  /** Mensagem de falha ao buscar as aulas. Nulo quando deu certo. */
  erro?: string | null;
  aoNovaAula: () => void;
  aoEditarAula: (aula: Aula) => void;
  /** Exclui de fato — a confirmacao de 1 clique acontece aqui no painel. */
  aoExcluirAula: (aula: Aula) => void;
};

/**
 * Painel "Aulas da turma" — a grade semanal da turma selecionada, empilhada
 * abaixo do painel de alunos na tela Coordenacao.
 *
 * Componente burro no que importa: nao busca nem grava nada, so' recebe as
 * aulas e devolve as intencoes por callback. O unico estado local e' de UI
 * pura — qual aula esta com a exclusao pendente de confirmacao (evita apagar
 * uma aula com um clique so', sem precisar de mais um modal na tela).
 *
 * As aulas chegam agrupadas por dia da semana e ordenadas por horario dentro
 * do dia, montado aqui a partir de `dia_semana`/`hora_inicio` — "HH:MM"
 * ordena certo como string (5 caracteres, zero a esquerda).
 */
export function PainelAulas({
  turma,
  aulas,
  carregando = false,
  erro = null,
  aoNovaAula,
  aoEditarAula,
  aoExcluirAula,
}: PainelAulasProps) {
  const [aulaParaExcluirId, setAulaParaExcluirId] = useState<number | null>(null);

  const porDia = useMemo(() => agruparPorDia(aulas), [aulas]);

  return (
    <div
      className="flex flex-col rounded-2xl"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        boxShadow: "var(--shadow-card)",
      }}
    >
      <div
        className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <div>
          <h2 className="text-text text-base font-extrabold">Aulas da turma</h2>
          <p className="text-text-muted text-xs">
            {turma
              ? `Grade semanal de ${turma.nome} na sala ${turma.sala_id}`
              : "Selecione uma turma para ver as aulas"}
          </p>
        </div>

        <button
          type="button"
          onClick={aoNovaAula}
          disabled={!turma}
          className="flex flex-none items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-extrabold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
          style={{ background: "var(--primary)" }}
        >
          <IconMais size={14} />
          Nova aula
        </button>
      </div>

      {/* Falha na busca aparece acima da lista: a lista anterior pode ainda
          estar na tela, e o usuario precisa saber que ela esta velha. */}
      {erro && (
        <p
          role="alert"
          className="mx-5 mt-4 rounded-xl px-4 py-3 text-sm font-semibold"
          style={{ background: "var(--danger-bg)", color: "var(--danger-fg)" }}
        >
          {erro}
        </p>
      )}

      {!turma ? (
        <p className="text-text-muted px-6 py-12 text-center text-sm">
          Nenhuma turma selecionada.
        </p>
      ) : carregando && aulas.length === 0 ? (
        <p className="text-text-muted px-6 py-12 text-center text-sm">Carregando aulas...</p>
      ) : aulas.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
          <span className="text-text-muted" aria-hidden>
            <IconCalendario size={28} />
          </span>
          <p className="text-text text-sm font-bold">Esta turma ainda não tem aulas.</p>
          <p className="text-text-muted text-xs">
            Cadastre o dia e o horário de cada encontro da semana.
          </p>
        </div>
      ) : (
        <div
          className="flex flex-col gap-5 p-5"
          // Enquanto recarrega, a lista antiga fica visivel mas apagada — o
          // usuario ve que o conteudo esta sendo atualizado.
          style={{ opacity: carregando ? 0.55 : 1 }}
        >
          {porDia.map(({ dia, nome, aulasDoDia }) => (
            <section key={dia} className="flex flex-col gap-2">
              <h3 className="text-text-muted text-[11px] font-extrabold tracking-wide uppercase">
                {nome}
              </h3>
              <ul className="flex flex-col gap-2">
                {aulasDoDia.map((aula) => (
                  <li
                    key={aula.id}
                    className="flex items-center gap-2 rounded-xl px-4 py-3"
                    style={{
                      background: "var(--surface-2)",
                      border:
                        aulaParaExcluirId === aula.id
                          ? "1.5px solid var(--danger)"
                          : "1.5px solid transparent",
                    }}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-text text-sm font-extrabold">
                        {aula.hora_inicio}–{aula.hora_fim}
                      </p>
                      <p className="text-text-muted truncate text-xs">
                        {aula.materia_nome ?? "Sem matéria"}
                      </p>
                    </div>

                    {aulaParaExcluirId === aula.id ? (
                      // Confirmacao inline: o DELETE de aula nao tem 409 nem
                      // consequencia em cascata (a sessao so' perde o vinculo),
                      // entao um segundo clique basta — modal seria excessivo.
                      <div className="flex flex-none items-center gap-1.5">
                        <span
                          className="hidden text-xs font-bold sm:inline"
                          style={{ color: "var(--danger)" }}
                        >
                          Excluir?
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setAulaParaExcluirId(null);
                            aoExcluirAula(aula);
                          }}
                          aria-label={`Confirmar exclusão da aula de ${rotuloAula(aula)}`}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-white"
                          style={{ background: "var(--danger)" }}
                        >
                          <IconCheck size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setAulaParaExcluirId(null)}
                          aria-label="Cancelar exclusão"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg"
                          style={{ color: "var(--text-muted)" }}
                        >
                          <IconFechar size={16} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-none items-center gap-0.5">
                        <button
                          type="button"
                          onClick={() => aoEditarAula(aula)}
                          aria-label={`Editar aula de ${rotuloAula(aula)}`}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
                          style={{ color: "var(--text-muted)" }}
                        >
                          <IconLapis />
                        </button>
                        <button
                          type="button"
                          onClick={() => setAulaParaExcluirId(aula.id)}
                          aria-label={`Excluir aula de ${rotuloAula(aula)}`}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
                          style={{ color: "var(--danger)" }}
                        >
                          <IconLixeira />
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

/** Texto curto que identifica a aula nos `aria-label` dos botoes de acao. */
function rotuloAula(aula: Aula): string {
  // formatarDiaSemana acentua: o backend grava "terca"/"sabado" sem acento, e
  // um leitor de tela le a string literal ("aula de terca"). As telas de Aulas
  // e Chamada ja usam esse mesmo formatador.
  return `${formatarDiaSemana(aula.dia_semana_nome)} ${aula.hora_inicio} às ${aula.hora_fim}`;
}

/**
 * Agrupa as aulas por dia da semana, na ordem do calendario, e ordena por
 * horario dentro de cada dia. Dias sem aula nenhuma nao aparecem.
 */
function agruparPorDia(aulas: Aula[]) {
  const grupos = new Map<number, Aula[]>();
  for (const aula of aulas) {
    const doDia = grupos.get(aula.dia_semana);
    if (doDia) doDia.push(aula);
    else grupos.set(aula.dia_semana, [aula]);
  }

  return [...grupos.entries()]
    .sort(([a], [b]) => a - b)
    .map(([dia, aulasDoDia]) => ({
      dia,
      // O nome do dia vem pronto do backend — usa o da primeira aula do grupo.
      // Acentuado aqui tambem: o cabecalho do grupo mostrava "TERCA" cru (o
      // uppercase e' so' CSS, nao arruma o acento que o backend nao gravou).
      nome: formatarDiaSemana(aulasDoDia[0].dia_semana_nome),
      aulasDoDia: [...aulasDoDia].sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio)),
    }));
}
