"use client";

import { useEffect, useId, useRef, useState } from "react";

import { useFocoPreso } from "@/components/coordenacao/usar-foco-preso";
import { IconFechar } from "@/components/ui/icons";
import type { Materia, NovaMateria } from "@/lib/types";

type ModoModal = "criar" | "editar";

type ModalMateriaProps = {
  aberto: boolean;
  modo: ModoModal;
  /** Materia sendo editada (obrigatorio no modo "editar"; ignorado no "criar"). */
  materia?: Materia | null;
  aoFechar: () => void;
  /** Rejeita com Error(mensagem) — o modal mostra o texto e permanece aberto. */
  aoSalvar: (dados: NovaMateria) => Promise<void>;
};

const VALORES_INICIAIS = { nome: "" };

/**
 * Modal de materia unificado — cria uma materia nova ou renomeia uma
 * existente, decidido pelo prop `modo`. Mesmo molde do `ModalTurma`: overlay
 * escurecido + card centrado, Esc fecha, clique fora fecha, foco inicial no
 * campo, reset ao abrir.
 *
 * Materia e' global (nao pertence a turma nenhuma) e tem um campo so'. A
 * unicidade do nome quem valida e' o backend — vira um 422 que a vista repassa
 * como Error e cai no erro inline aqui.
 */
export function ModalMateria({
  aberto,
  modo,
  materia,
  aoFechar,
  aoSalvar,
}: ModalMateriaProps) {
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
      setValores(editando && materia ? { nome: materia.nome } : VALORES_INICIAIS);
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

  async function aoSubmeter(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErroApi(null);

    const nome = valores.nome.trim();
    if (!nome) {
      setErroValidacao("Informe o nome da matéria.");
      return;
    }
    setErroValidacao(null);

    setEnviando(true);
    try {
      await aoSalvar({ nome });
      // Sucesso: quem chama (a vista) fecha e recarrega — nao mexe aqui.
    } catch (causa) {
      setErroApi(
        causa instanceof Error
          ? causa.message
          : `Não foi possível ${editando ? "renomear" : "criar"} a matéria.`,
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
            {editando ? "Renomear matéria" : "Nova matéria"}
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
          <label className="flex flex-col gap-1.5">
            <span className="text-text-muted text-xs font-bold">Nome da matéria</span>
            <input
              ref={primeiroCampoRef}
              type="text"
              required
              value={valores.nome}
              onChange={(evento) => setValores({ nome: evento.target.value })}
              placeholder="História"
              className="text-text w-full rounded-lg bg-transparent px-3 py-2 text-sm outline-none"
              style={{ border: "1px solid var(--border)" }}
              disabled={enviando}
            />
          </label>

          {/* Renomear vale pra grade inteira: a materia e' global, nao uma
              copia por aula. Sem esse aviso o usuario pode achar que so' a
              turma aberta seria afetada. */}
          {editando && (
            <p className="text-text-muted text-xs leading-relaxed">
              A matéria é usada por todas as turmas — o novo nome aparece em
              todas as aulas que a utilizam.
            </p>
          )}

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
                  : "Criar matéria"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
