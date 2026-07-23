"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { IconSeta, IconTurma } from "@/components/ui/icons";
import type { Turma } from "@/lib/types";

type SeletorTurmaProps = {
  turmas: Turma[];
  turmaAtualId: number;
  /** Rota que recebe o id da turma escolhida. Padrao: tela Minhas Aulas. */
  baseRota?: string;
};

/**
 * Troca a turma exibida.
 *
 * Navega para /aulas/{id} em vez de guardar a escolha em estado local: assim
 * a turma fica no endereco, o professor pode salvar o link e o botao voltar
 * do navegador funciona como esperado.
 */
export function SeletorTurma({
  turmas,
  turmaAtualId,
  baseRota = "/aulas",
}: SeletorTurmaProps) {
  const router = useRouter();
  // useTransition marca a navegacao como nao urgente e expoe `pendente`,
  // para o seletor mostrar que esta carregando em vez de parecer travado.
  const [pendente, iniciarTransicao] = useTransition();

  if (turmas.length === 0) return null;

  return (
    <label
      className="border-border-default bg-surface flex items-center gap-2.5 rounded-xl border px-4 py-2.5"
      style={{ opacity: pendente ? 0.6 : 1 }}
    >
      <span className="flex-none" style={{ color: "var(--primary)" }}>
        <IconTurma />
      </span>

      <span className="sr-only">Escolher turma</span>

      <select
        value={turmaAtualId}
        disabled={pendente}
        onChange={(evento) => {
          const id = evento.target.value;
          iniciarTransicao(() => router.push(`${baseRota}/${id}`));
        }}
        className="text-text cursor-pointer appearance-none bg-transparent pr-1 text-sm font-bold outline-none"
      >
        {turmas.map((turma) => (
          <option key={turma.id} value={turma.id}>
            {turma.nome}
          </option>
        ))}
      </select>

      <span className="text-text-muted flex-none" aria-hidden>
        <IconSeta />
      </span>
    </label>
  );
}
