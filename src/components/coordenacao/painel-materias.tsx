"use client";

import { useState } from "react";

import {
  IconAulas,
  IconCheck,
  IconFechar,
  IconLapis,
  IconLixeira,
  IconMais,
} from "@/components/ui/icons";
import type { Materia } from "@/lib/types";

type PainelMateriasProps = {
  /** Materias cadastradas, ja ordenadas pelo backend. */
  materias: Materia[];
  /** true enquanto a lista esta sendo buscada. */
  carregando?: boolean;
  /** Mensagem de falha ao buscar ou ao excluir. Nulo quando esta tudo certo. */
  erro?: string | null;
  aoNovaMateria: () => void;
  aoEditarMateria: (materia: Materia) => void;
  /** Exclui de fato — a confirmacao de 1 clique acontece aqui no painel. */
  aoExcluirMateria: (materia: Materia) => void;
};

/**
 * Painel "Matérias" — a lista global de materias da escola.
 *
 * Materia nao pertence a turma nenhuma: e' um catalogo compartilhado que
 * alimenta o dropdown do `ModalAula`. Por isso o painel fica numa secao
 * propria, fora da coluna da turma selecionada.
 *
 * Componente burro no que importa: nao busca nem grava nada, so' recebe a
 * lista e devolve as intencoes por callback. O unico estado local e' de UI
 * pura — qual materia esta com a exclusao pendente de confirmacao.
 *
 * Diferente da aula, o DELETE de materia PODE falhar (409 quando alguma aula
 * usa a materia). A confirmacao inline continua valendo, mas a mensagem de
 * bloqueio volta pela prop `erro`, montada pela vista com o total de aulas.
 */
export function PainelMaterias({
  materias,
  carregando = false,
  erro = null,
  aoNovaMateria,
  aoEditarMateria,
  aoExcluirMateria,
}: PainelMateriasProps) {
  const [materiaParaExcluirId, setMateriaParaExcluirId] = useState<number | null>(null);

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
          <h2 className="text-text text-base font-extrabold">Matérias</h2>
          <p className="text-text-muted text-xs">
            Usadas por todas as turmas ao cadastrar uma aula
          </p>
        </div>

        <button
          type="button"
          onClick={aoNovaMateria}
          className="flex flex-none items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-extrabold text-white transition-opacity"
          style={{ background: "var(--primary)" }}
        >
          <IconMais size={14} />
          Nova matéria
        </button>
      </div>

      {/* Falha aparece acima da lista: a lista anterior pode ainda estar na
          tela, e o usuario precisa saber que ela esta velha (ou que a exclusao
          que ele acabou de confirmar foi barrada). */}
      {erro && (
        <p
          role="alert"
          className="mx-5 mt-4 rounded-xl px-4 py-3 text-sm font-semibold"
          style={{ background: "var(--danger-bg)", color: "var(--danger-fg)" }}
        >
          {erro}
        </p>
      )}

      {carregando && materias.length === 0 ? (
        <p className="text-text-muted px-6 py-12 text-center text-sm">
          Carregando matérias...
        </p>
      ) : materias.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
          <span className="text-text-muted" aria-hidden>
            <IconAulas size={28} />
          </span>
          <p className="text-text text-sm font-bold">Nenhuma matéria cadastrada.</p>
          <p className="text-text-muted text-xs">
            Cadastre as matérias para poder vinculá-las às aulas da grade.
          </p>
        </div>
      ) : (
        <ul
          className="grid gap-2 p-5 sm:grid-cols-2 lg:grid-cols-3"
          // Enquanto recarrega, a lista antiga fica visivel mas apagada — o
          // usuario ve que o conteudo esta sendo atualizado.
          style={{ opacity: carregando ? 0.55 : 1 }}
        >
          {materias.map((materia) => (
            <li
              key={materia.id}
              className="flex items-center gap-2 rounded-xl px-4 py-3"
              style={{
                background: "var(--surface-2)",
                border:
                  materiaParaExcluirId === materia.id
                    ? "1.5px solid var(--danger)"
                    : "1.5px solid transparent",
              }}
            >
              <p className="text-text min-w-0 flex-1 truncate text-sm font-extrabold">
                {materia.nome}
              </p>

              {materiaParaExcluirId === materia.id ? (
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
                      setMateriaParaExcluirId(null);
                      aoExcluirMateria(materia);
                    }}
                    aria-label={`Confirmar exclusão da matéria ${materia.nome}`}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-white"
                    style={{ background: "var(--danger)" }}
                  >
                    <IconCheck size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setMateriaParaExcluirId(null)}
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
                    onClick={() => aoEditarMateria(materia)}
                    aria-label={`Renomear matéria ${materia.nome}`}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
                    style={{ color: "var(--text-muted)" }}
                  >
                    <IconLapis />
                  </button>
                  <button
                    type="button"
                    onClick={() => setMateriaParaExcluirId(materia.id)}
                    aria-label={`Excluir matéria ${materia.nome}`}
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
      )}
    </div>
  );
}
