"use client";

import { useEffect, useId, useRef, useState } from "react";

import { useFocoPreso } from "@/components/administracao/usar-foco-preso";
import { IconFechar } from "@/components/ui/icons";
import type { AlunoAdmin } from "@/lib/types";

/** Detalhe do 409 (historico de presenca) que a chamada de exclusao anexa ao Error. */
type ErroComHistorico = Error & {
  historico?: { nome: string; total_registros: number };
};

type ModalConfirmarExclusaoProps = {
  /** Aluno a excluir. Nulo fecha o modal (mesmo criterio de `aberto`). */
  aluno: AlunoAdmin | null;
  aberto: boolean;
  aoFechar: () => void;
  /**
   * Exclui de fato. Rejeita com Error(mensagem) — o modal mostra o texto e
   * permanece aberto. Quando a API devolve 409 (aluno tem historico de
   * presenca), o erro rejeitado carrega `.historico` ({nome, total_registros})
   * — o modal usa isso pra trocar pro estagio 2 sozinho, sem a vista precisar
   * saber em que estagio o modal esta.
   */
  aoConfirmar: (confirmarHistorico: boolean) => Promise<void>;
};

/**
 * Modal "Excluir aluno" — segue o molde do ModalNovaTurma/ModalNovoAluno
 * (overlay escurecido, Esc fecha, clique fora fecha, scroll do body travado,
 * reset ao abrir), mas sem formulario: so' dois estagios de confirmacao.
 *
 * Estagio 1 (neutro): "Excluir {nome}? O reconhecimento facial dele sera
 * removido." Estagio 2 (so' entra se a API recusar com 409): visual de
 * perigo, mostra quantos registros de chamada existem e avisa que a acao
 * nao tem volta. O estagio 2 reenvia `aoConfirmar(true)`.
 */
export function ModalConfirmarExclusao({
  aluno,
  aberto,
  aoFechar,
  aoConfirmar,
}: ModalConfirmarExclusaoProps) {
  const [historico, setHistorico] = useState<{ nome: string; total_registros: number } | null>(
    null,
  );
  const [erroApi, setErroApi] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const botaoConfirmarRef = useRef<HTMLButtonElement>(null);
  const idTitulo = useId();
  const refModal = useFocoPreso(aberto);

  // Espelha (aberto, aluno.ra) so' pra detectar a transicao durante a
  // renderizacao (padrao oficial "estado derivado de props/estado anterior",
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes)
  // em vez de resetar via setState dentro de um useEffect. Reseta o estagio
  // toda vez que o modal abre — nunca comeca no estagio 2 de uma tentativa
  // anterior, mesmo excluindo outro aluno em seguida.
  const chaveAtual = `${aberto}:${aluno?.ra ?? ""}`;
  const [chaveAnterior, setChaveAnterior] = useState(chaveAtual);
  if (chaveAtual !== chaveAnterior) {
    setChaveAnterior(chaveAtual);
    if (aberto) {
      setHistorico(null);
      setErroApi(null);
      setEnviando(false);
    }
  }

  // Foco no botao de confirmar assim que o modal monta — efeito de DOM, nao
  // de estado, entao continua em useEffect (nao dispara o lint de setState).
  useEffect(() => {
    if (!aberto) return;
    botaoConfirmarRef.current?.focus();
  }, [aberto, aluno?.ra]);

  // Esc fecha — mesmo padrao dos outros modais da tela (sidebar.tsx).
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

  if (!aberto || !aluno) return null;

  async function aoClicarConfirmar() {
    setErroApi(null);
    setEnviando(true);
    try {
      await aoConfirmar(historico !== null);
      // Sucesso: quem chama (a vista) fecha e recarrega — nao mexe aqui.
    } catch (causa) {
      const erro = causa as ErroComHistorico;
      if (erro?.historico) {
        // 409: aluno tem historico de presenca — troca pro estagio 2 em vez
        // de mostrar isso como um erro generico.
        setHistorico(erro.historico);
        setErroApi(null);
      } else {
        setErroApi(erro instanceof Error ? erro.message : "Não foi possível excluir o aluno.");
      }
    } finally {
      setEnviando(false);
    }
  }

  const estagioPerigo = historico !== null;
  const totalRegistros = historico?.total_registros ?? 0;
  const rotuloRegistros = totalRegistros === 1 ? "registro" : "registros";

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
          border: estagioPerigo ? "1px solid var(--danger)" : "1px solid var(--border)",
          boxShadow: "var(--shadow-raise)",
        }}
      >
        <div className="flex items-center justify-between gap-2">
          <h2
            id={idTitulo}
            className="text-text text-lg font-extrabold"
            style={{ fontFamily: "var(--font-geologica)" }}
          >
            {estagioPerigo ? "Excluir com histórico de presença" : "Excluir aluno"}
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

        {estagioPerigo ? (
          <p
            className="rounded-xl px-4 py-3 text-sm leading-relaxed font-semibold"
            style={{ background: "var(--danger-bg)", color: "var(--danger-fg)" }}
          >
            {historico!.nome} tem {totalRegistros} {rotuloRegistros} de presença. Excluir apaga
            esse histórico. Ação sem volta.
          </p>
        ) : (
          <p className="text-text-body text-sm leading-relaxed">
            Excluir {aluno.nome}? O reconhecimento facial dele será removido.
          </p>
        )}

        {erroApi && (
          <p
            role="alert"
            className="rounded-xl px-4 py-3 text-sm font-semibold"
            style={{ background: "var(--danger-bg)", color: "var(--danger-fg)" }}
          >
            {erroApi}
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
            ref={botaoConfirmarRef}
            type="button"
            onClick={aoClicarConfirmar}
            disabled={enviando}
            className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-extrabold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-60"
            style={{ background: "var(--danger)" }}
          >
            {enviando && (
              <span
                aria-hidden
                className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white"
              />
            )}
            {enviando
              ? "Excluindo..."
              : estagioPerigo
                ? "Excluir mesmo assim"
                : "Excluir"}
          </button>
        </div>
      </div>
    </div>
  );
}
