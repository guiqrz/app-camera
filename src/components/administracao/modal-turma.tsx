"use client";

import { useEffect, useId, useRef, useState } from "react";

import { useFocoPreso } from "@/components/administracao/usar-foco-preso";
import { IconFechar } from "@/components/ui/icons";
import type { NovaTurma, TurmaAdmin } from "@/lib/types";

type ModoModal = "criar" | "editar";

type ModalTurmaProps = {
  aberto: boolean;
  modo: ModoModal;
  /** Turma sendo editada (obrigatorio no modo "editar"; ignorado no "criar"). */
  turma?: TurmaAdmin | null;
  aoFechar: () => void;
  /** Rejeita com Error(mensagem) — o modal mostra o texto e permanece aberto. */
  aoSalvar: (dados: NovaTurma) => Promise<void>;
};

/** 0 = domingo ... 6 = sabado, mesma convencao de `TurmaAdmin.dia_semana`. */
const DIAS_DA_SEMANA = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
];

const VALORES_INICIAIS = {
  nome: "",
  sala_id: "",
  dia_semana: "1",
  hora_inicio: "",
  hora_fim: "",
};

/**
 * Modal de turma unificado — cria uma turma nova ou edita uma existente,
 * decidido pelo prop `modo`. Overlay escurecido + card centrado, Esc fecha,
 * clique fora fecha, foco inicial no primeiro campo, reset ao abrir.
 *
 * Validacao de fim > inicio replica a regra do backend
 * (`cupcam/gestao/turmas.py`): "HH:MM" compara certo como string porque tem
 * sempre 5 caracteres com zero a esquerda. O conflito de horario com outra
 * turma so' o backend sabe validar (precisa das outras turmas da sala) — vira
 * um 409 que a vista repassa como Error e cai no erro inline aqui.
 */
export function ModalTurma({ aberto, modo, turma, aoFechar, aoSalvar }: ModalTurmaProps) {
  const [valores, setValores] = useState(VALORES_INICIAIS);
  const [erroValidacao, setErroValidacao] = useState<string | null>(null);
  const [erroApi, setErroApi] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const editando = modo === "editar";

  // Espelha `aberto` so' pra detectar a transicao fechado->aberto durante a
  // renderizacao (padrao oficial "estado derivado de props/estado anterior",
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes)
  // em vez de resetar via setState dentro de um useEffect.
  const [abertoAnterior, setAbertoAnterior] = useState(aberto);
  if (aberto !== abertoAnterior) {
    setAbertoAnterior(aberto);
    if (aberto) {
      if (editando && turma) {
        setValores({
          nome: turma.nome,
          sala_id: turma.sala_id,
          dia_semana: String(turma.dia_semana),
          hora_inicio: turma.hora_inicio,
          hora_fim: turma.hora_fim,
        });
      } else {
        setValores(VALORES_INICIAIS);
      }
      setErroValidacao(null);
      setErroApi(null);
      setEnviando(false);
    }
  }

  const primeiroCampoRef = useRef<HTMLInputElement>(null);
  const idTitulo = useId();
  const refModal = useFocoPreso(aberto);

  useEffect(() => {
    if (!aberto) return;
    primeiroCampoRef.current?.focus();
  }, [aberto]);

  useEffect(() => {
    if (!aberto) return;

    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") aoFechar();
    };

    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [aberto, aoFechar]);

  useEffect(() => {
    if (!aberto) return;

    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = anterior;
    };
  }, [aberto]);

  if (!aberto) return null;

  function atualizarCampo<K extends keyof typeof VALORES_INICIAIS>(
    campo: K,
    valor: (typeof VALORES_INICIAIS)[K],
  ) {
    setValores((atuais) => ({ ...atuais, [campo]: valor }));
  }

  async function aoSubmeter(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErroApi(null);

    const { nome, sala_id, dia_semana, hora_inicio, hora_fim } = valores;
    if (!nome.trim() || !sala_id.trim() || !hora_inicio || !hora_fim) {
      setErroValidacao("Preencha todos os campos.");
      return;
    }
    if (hora_fim <= hora_inicio) {
      setErroValidacao("O horário de fim precisa ser depois do horário de início.");
      return;
    }
    setErroValidacao(null);

    const dados: NovaTurma = {
      nome: nome.trim(),
      sala_id: sala_id.trim(),
      dia_semana: Number(dia_semana),
      hora_inicio,
      hora_fim,
    };

    setEnviando(true);
    try {
      await aoSalvar(dados);
      // Sucesso: quem chama (a vista) fecha e recarrega — nao mexe aqui.
    } catch (causa) {
      setErroApi(
        causa instanceof Error
          ? causa.message
          : `Não foi possível ${editando ? "salvar" : "criar"} a turma.`,
      );
    } finally {
      setEnviando(false);
    }
  }

  const erroExibido = erroValidacao ?? erroApi;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={aoFechar}
    >
      <div
        ref={refModal}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        onClick={(evento) => evento.stopPropagation()}
        className="flex w-full max-w-md flex-col gap-5 rounded-2xl p-6"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          boxShadow: "var(--shadow-raise)",
        }}
      >
        <div className="flex items-center justify-between gap-2">
          <h2
            id={idTitulo}
            className="text-text text-lg font-extrabold"
            style={{ fontFamily: "var(--font-geologica)" }}
          >
            {editando ? "Editar turma" : "Nova turma"}
          </h2>
          <button
            type="button"
            onClick={aoFechar}
            aria-label="Fechar"
            className="text-text-muted rounded-lg p-1"
            disabled={enviando}
          >
            <IconFechar size={20} />
          </button>
        </div>

        <form onSubmit={aoSubmeter} className="flex flex-col gap-4" noValidate>
          <Campo rotulo="Nome da turma">
            <input
              ref={primeiroCampoRef}
              type="text"
              required
              value={valores.nome}
              onChange={(evento) => atualizarCampo("nome", evento.target.value)}
              placeholder="Turma 8A"
              className="text-text w-full rounded-lg bg-transparent px-3 py-2 text-sm outline-none"
              style={{ border: "1px solid var(--border)" }}
              disabled={enviando}
            />
          </Campo>

          <Campo rotulo="Sala">
            <input
              type="text"
              required
              value={valores.sala_id}
              onChange={(evento) => atualizarCampo("sala_id", evento.target.value)}
              placeholder="sala_32A"
              className="text-text w-full rounded-lg bg-transparent px-3 py-2 text-sm outline-none"
              style={{ border: "1px solid var(--border)" }}
              disabled={enviando}
            />
          </Campo>

          <Campo rotulo="Dia da semana">
            <select
              value={valores.dia_semana}
              onChange={(evento) => atualizarCampo("dia_semana", evento.target.value)}
              className="text-text w-full rounded-lg bg-transparent px-3 py-2 text-sm outline-none"
              style={{ border: "1px solid var(--border)" }}
              disabled={enviando}
            >
              {DIAS_DA_SEMANA.map((nomeDia, indice) => (
                <option key={indice} value={indice}>
                  {nomeDia}
                </option>
              ))}
            </select>
          </Campo>

          <div className="grid grid-cols-2 gap-3">
            <Campo rotulo="Início">
              <input
                type="time"
                required
                value={valores.hora_inicio}
                onChange={(evento) => atualizarCampo("hora_inicio", evento.target.value)}
                className="text-text w-full rounded-lg bg-transparent px-3 py-2 text-sm outline-none"
                style={{ border: "1px solid var(--border)" }}
                disabled={enviando}
              />
            </Campo>
            <Campo rotulo="Fim">
              <input
                type="time"
                required
                value={valores.hora_fim}
                onChange={(evento) => atualizarCampo("hora_fim", evento.target.value)}
                className="text-text w-full rounded-lg bg-transparent px-3 py-2 text-sm outline-none"
                style={{ border: "1px solid var(--border)" }}
                disabled={enviando}
              />
            </Campo>
          </div>

          {erroExibido && (
            <p
              role="alert"
              className="rounded-xl px-4 py-3 text-sm font-semibold"
              style={{ background: "var(--danger-bg)", color: "var(--danger-fg)" }}
            >
              {erroExibido}
            </p>
          )}

          <div className="mt-1 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={aoFechar}
              disabled={enviando}
              className="text-text-body rounded-lg px-4 py-2.5 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-40"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={enviando}
              className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-extrabold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-60"
              style={{ background: "var(--primary)" }}
            >
              {enviando && (
                <span
                  aria-hidden
                  className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white"
                />
              )}
              {enviando
                ? editando
                  ? "Salvando..."
                  : "Criando..."
                : editando
                  ? "Salvar alterações"
                  : "Criar turma"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Campo({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-text-muted text-xs font-bold">{rotulo}</span>
      {children}
    </label>
  );
}
