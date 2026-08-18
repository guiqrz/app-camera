"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { IconSeta, IconTurma } from "@/components/ui/icons";
import type { Turma } from "@/lib/types";

/** Valor da opcao "todas" no <select> — "" seria indistinguivel de vazio. */
const TODAS = "geral";

type SeletorTurmaProps = {
  turmas: Turma[];
  /**
   * Turma exibida, ou `null` para o estado "Todas as turmas".
   *
   * `null` so' e' valido quando `comOpcaoTodas` esta ligado — as outras telas
   * (Chamada) nao tem visao consolidada e sempre passam um id.
   */
  turmaAtualId: number | null;
  /** Rota que recebe o id da turma escolhida. Padrao: tela Minhas Aulas. */
  baseRota?: string;
  /**
   * Inclui "Todas as turmas" na lista, navegando pra `baseRota` sem id.
   *
   * Desligado por padrao: so' a tela Minhas Aulas tem um estado consolidado.
   * Em Chamada, "todas as turmas" nao significa nada — a chamada e' sempre de
   * uma sessao especifica.
   */
  comOpcaoTodas?: boolean;
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
  comOpcaoTodas = false,
}: SeletorTurmaProps) {
  const router = useRouter();
  // useTransition marca a navegacao como nao urgente e expoe `pendente`,
  // para o seletor mostrar que esta carregando em vez de parecer travado.
  const [pendente, iniciarTransicao] = useTransition();

  if (turmas.length === 0) return null;

  return (
    // Medidas do `.escopo` do prototipo: 7px 12px, raio 9px, gap 8px, e fundo
    // MAIS FRACO que o do card (0.035 contra 0.055) — controle nao compete
    // com conteudo.
    <label
      className="border-border-default flex items-center gap-2 rounded-[9px] border px-3 py-[7px]"
      style={{
        opacity: pendente ? 0.6 : 1,
        background: "var(--surface-2)",
      }}
    >
      <span className="text-text-muted flex-none">
        <IconTurma size={15} />
      </span>

      <span className="sr-only">Escolher turma</span>

      <select
        value={turmaAtualId ?? TODAS}
        disabled={pendente}
        onChange={(evento) => {
          const escolhido = evento.target.value;
          // "todas" volta pra rota SEM id, que e' a visao consolidada.
          const destino =
            escolhido === TODAS ? baseRota : `${baseRota}/${escolhido}`;
          iniciarTransicao(() => router.push(destino));
        }}
        className="text-text cursor-pointer appearance-none bg-transparent pr-0.5 text-[12.5px] font-semibold outline-none"
      >
        {comOpcaoTodas && <option value={TODAS}>Todas as turmas</option>}
        {turmas.map((turma) => (
          <option key={turma.id} value={turma.id}>
            {turma.nome}
          </option>
        ))}
      </select>

      <span className="text-text-muted flex-none" aria-hidden>
        <IconSeta size={13} />
      </span>
    </label>
  );
}
