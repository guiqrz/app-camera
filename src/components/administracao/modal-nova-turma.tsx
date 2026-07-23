"use client";

import { useEffect, useId, useRef, useState } from "react";

import { IconFechar } from "@/components/ui/icons";
import type { NovaTurma } from "@/lib/types";

type ModalNovaTurmaProps = {
  aberto: boolean;
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
 * Modal "Nova turma" — primeiro modal do app, pensado pra ser o molde dos
 * proximos (overlay escurecido + card centrado, Esc fecha, clique fora fecha,
 * foco inicial no primeiro campo).
 *
 * Validacao de fim > inicio replica a regra do backend
 * (`cupcam/gestao/turmas.py`): "HH:MM" compara certo como string porque tem
 * sempre 5 caracteres com zero a esquerda — mesmo truque, sem reimplementar
 * parsing de hora aqui.
 */
export function ModalNovaTurma({ aberto, aoFechar, aoSalvar }: ModalNovaTurmaProps) {
  const [valores, setValores] = useState(VALORES_INICIAIS);
  const [erroValidacao, setErroValidacao] = useState<string | null>(null);
  const [erroApi, setErroApi] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const primeiroCampoRef = useRef<HTMLInputElement>(null);
  const idTitulo = useId();

  // Reseta o formulario toda vez que o modal abre — nao carrega lixo da
  // ultima tentativa (sucesso ou erro).
  useEffect(() => {
    if (!aberto) return;
    setValores(VALORES_INICIAIS);
    setErroValidacao(null);
    setErroApi(null);
    setEnviando(false);
    // Foco no primeiro campo assim que o modal monta.
    primeiroCampoRef.current?.focus();
  }, [aberto]);

  // Esc fecha — mesmo padrao da gaveta do menu (sidebar.tsx).
  useEffect(() => {
    if (!aberto) return;

    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") aoFechar();
    };

    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [aberto, aoFechar]);

  // Trava a rolagem do fundo enquanto o modal esta aberto.
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

    // Validacao cliente: campos vazios primeiro, depois a regra de horario.
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
      setErroApi(causa instanceof Error ? causa.message : "Não foi possível criar a turma.");
    } finally {
      setEnviando(false);
    }
  }

  const erroExibido = erroValidacao ?? erroApi;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={aoFechar}
      aria-hidden={false}
    >
      <div
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
            Nova turma
          </h2>
          <button
            type="button"
            onClick={aoFechar}
            aria-label="Fechar"
            className="text-text-muted rounded-lg p-1"
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
              {enviando ? "Criando..." : "Criar turma"}
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
