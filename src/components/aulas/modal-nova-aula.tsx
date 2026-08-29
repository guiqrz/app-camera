"use client";

import { useState } from "react";

import { EtiquetaMateria } from "@/components/ui/etiqueta-materia";
import { Modal } from "@/components/ui/modal";
import type { Materia, NovaAula, Turma } from "@/lib/types";
import type { Turno } from "@/lib/turnos";

/**
 * Aula NOVA na agenda, num modal centrado.
 *
 * POR QUE NAO E' O `FormularioAula` DA COORDENACAO: aquele e' inline, cabe numa
 * coluna estreita da grade e NAO tem turma — ele vive dentro da pagina de uma
 * turma, onde a resposta ja' esta na tela. Aqui a agenda pode estar em "todas
 * as turmas", e sem escolher a turma nao ha' onde criar a aula. Reescrever
 * aquele pra servir aos dois casos mexeria numa tela que nao esta em questao.
 *
 * O DIA NAO E' UM CAMPO: vem da coluna onde o modal abriu, o que elimina o erro
 * de escolher o dia errado depois de ter clicado no dia certo. Mesma decisao do
 * FormularioAula e do FormularioEvento.
 */

/** Valor do <option> "Sem matéria" — vira `materia_id: null` no envio. */
const SEM_MATERIA = "";

const ESTILO_CAMPO =
  "bg-surface-2 border-border-default text-text w-full rounded-[9px] border px-[11px] py-[9px] text-[13px] outline-none focus:outline-2 focus:-outline-offset-1 focus:outline-[var(--primary-hover)] disabled:opacity-50";

const ROTULO = "text-text-muted text-[10px] font-bold tracking-[0.1em] uppercase";

const NOME_DO_DIA: Record<number, string> = {
  0: "domingo",
  1: "segunda-feira",
  2: "terça-feira",
  3: "quarta-feira",
  4: "quinta-feira",
  5: "sexta-feira",
  6: "sábado",
};

type Props = {
  /** Dia da coluna onde o modal abriu. 0 = domingo ... 6 = sabado. */
  diaSemana: number;
  /** Turma da agenda. null = consolidada, e o seletor de turma aparece. */
  turmaId: number | null;
  /** Turmas pro seletor. So' usado quando `turmaId` e' null. */
  turmas?: Turma[];
  materias: Materia[];
  /** Turno de referencia — alimenta o placeholder do horario. */
  turno: Turno;
  aoCancelar: () => void;
  /** Rejeita com Error(mensagem) — o modal mostra o texto e fica aberto. */
  aoSalvar: (turmaId: number, dados: NovaAula) => Promise<void>;
};

export function ModalNovaAula({
  diaSemana,
  turmaId,
  turmas = [],
  materias,
  turno,
  aoCancelar,
  aoSalvar,
}: Props) {
  const [horaInicio, setHoraInicio] = useState("");
  const [horaFim, setHoraFim] = useState("");
  const [materiaId, setMateriaId] = useState(SEM_MATERIA);
  const [turmaEscolhida, setTurmaEscolhida] = useState<number | null>(
    // Numa turma so', ela ja' vem escolhida. Na consolidada com uma unica turma
    // cadastrada, escolher por ele evita um dropdown de um item so'.
    turmaId ?? (turmas.length === 1 ? turmas[0].id : null),
  );
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const precisaEscolherTurma = turmaId === null;

  // Materia selecionada, so' pra previa da cor abaixo do dropdown.
  const materiaEscolhida =
    materiaId === SEM_MATERIA
      ? null
      : (materias.find((materia) => String(materia.id) === materiaId) ?? null);

  async function aoSubmeter(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();

    if (turmaEscolhida === null) {
      setErro("Escolha a turma desta aula.");
      return;
    }
    if (!horaInicio || !horaFim) {
      setErro("Preencha o horário de início e de fim.");
      return;
    }
    // Replica a regra do backend (gestao/aulas.py) so' pra dar resposta rapida.
    // "HH:MM" compara certo como string: sao sempre 5 caracteres com zero a
    // esquerda. O conflito de horario com outra turma so' o backend sabe — ele
    // volta como 409 e cai no erro aqui embaixo.
    if (horaFim <= horaInicio) {
      setErro("O horário de fim precisa ser depois do horário de início.");
      return;
    }
    setErro(null);

    setEnviando(true);
    try {
      await aoSalvar(turmaEscolhida, {
        dia_semana: diaSemana,
        hora_inicio: horaInicio,
        hora_fim: horaFim,
        // Sempre explicito, inclusive null: o PUT do backend e' substituicao
        // total, e omitir limparia a materia.
        materia_id: materiaId === SEM_MATERIA ? null : Number(materiaId),
      });
    } catch (causa) {
      setErro(
        causa instanceof Error ? causa.message : "Não foi possível criar a aula.",
      );
      setEnviando(false);
    }
  }

  return (
    <Modal
      aberto
      titulo="Nova aula"
      subtitulo={`Toda ${NOME_DO_DIA[diaSemana]}`}
      largura="grande"
      ocupado={enviando}
      aoFechar={aoCancelar}
      rodape={
        <>
          <button
            type="button"
            onClick={aoCancelar}
            disabled={enviando}
            className="bg-surface-2 border-border-default text-text-body rounded-[9px] border px-4 py-2.5 text-[13px] font-semibold disabled:opacity-40"
          >
            Cancelar
          </button>
          {/* `form=` liga o botao ao formulario mesmo estando FORA dele: o
              rodape do modal e' irmao da area que rola, nao filho do form. */}
          <button
            type="submit"
            form="formulario-nova-aula"
            disabled={enviando}
            className="flex items-center justify-center gap-2 rounded-[9px] px-5 py-2.5 text-[13px] font-semibold transition-opacity disabled:opacity-60"
            style={{ background: "var(--primary)", color: "var(--text-on-brand)" }}
          >
            {enviando && (
              <span
                aria-hidden
                className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current/40 border-t-current"
              />
            )}
            {enviando ? "Criando..." : "Adicionar aula"}
          </button>
        </>
      }
    >
      <form
        id="formulario-nova-aula"
        onSubmit={aoSubmeter}
        noValidate
        className="flex flex-col gap-4 pb-2"
      >
        {precisaEscolherTurma && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="aula-turma" className={ROTULO}>
              Turma
            </label>
            <select
              id="aula-turma"
              value={turmaEscolhida ?? ""}
              onChange={(evento) =>
                setTurmaEscolhida(
                  evento.target.value ? Number(evento.target.value) : null,
                )
              }
              disabled={enviando}
              autoFocus
              className={`${ESTILO_CAMPO} cursor-pointer`}
            >
              <option value="">Escolha a turma…</option>
              {turmas.map((turma) => (
                <option key={turma.id} value={turma.id}>
                  {turma.nome}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="aula-inicio" className={ROTULO}>
              Início
            </label>
            <input
              id="aula-inicio"
              type="time"
              value={horaInicio}
              onChange={(evento) => setHoraInicio(evento.target.value)}
              disabled={enviando}
              autoFocus={!precisaEscolherTurma}
              className={ESTILO_CAMPO}
            />
            <span className="text-text-muted text-[11px]">
              Costuma começar às {turno.inicio}
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="aula-fim" className={ROTULO}>
              Fim
            </label>
            <input
              id="aula-fim"
              type="time"
              value={horaFim}
              onChange={(evento) => setHoraFim(evento.target.value)}
              disabled={enviando}
              className={ESTILO_CAMPO}
            />
            <span className="text-text-muted text-[11px]">
              Costuma terminar às {turno.fim}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="aula-materia" className={ROTULO}>
            Matéria (opcional)
          </label>
          <select
            id="aula-materia"
            value={materiaId}
            onChange={(evento) => setMateriaId(evento.target.value)}
            disabled={enviando}
            className={`${ESTILO_CAMPO} cursor-pointer`}
          >
            <option value={SEM_MATERIA}>Sem matéria</option>
            {materias.map((materia) => (
              <option key={materia.id} value={materia.id}>
                {materia.nome}
              </option>
            ))}
          </select>
          {/* Previa da cor FORA do <select>: estilizar <option> nao funciona de
              forma confiavel entre navegadores (varios ignoram background no
              menu nativo), entao o grifo aparece aqui embaixo. */}
          {materiaEscolhida?.cor && (
            <span className="mt-0.5 text-[11px]">
              <EtiquetaMateria
                nome={materiaEscolhida.nome}
                cor={materiaEscolhida.cor}
              />
            </span>
          )}
        </div>

        {erro && (
          <p
            role="alert"
            className="rounded-xl px-4 py-3 text-[13px] font-semibold"
            style={{ background: "var(--danger-bg)", color: "var(--danger-fg)" }}
          >
            {erro}
          </p>
        )}
      </form>
    </Modal>
  );
}
