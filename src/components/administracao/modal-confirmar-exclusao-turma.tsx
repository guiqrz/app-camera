"use client";

import { useEffect, useId, useRef, useState } from "react";

import { useFocoPreso } from "@/components/administracao/usar-foco-preso";
import { IconFechar } from "@/components/ui/icons";
import type { TurmaAdmin } from "@/lib/types";

/**
 * Motivo pelo qual a API recusou a exclusao (409). "alunos" o usuario resolve
 * (mover/excluir os alunos); "historico" nao — aula gravada e' permanente.
 */
export type BloqueioTurma = {
  motivo: "alunos" | "historico";
  nome: string;
  total: number;
};

/** Detalhe do 409 que a chamada de exclusao anexa ao Error. */
type ErroComAlunos = Error & {
  turmaBloqueada?: BloqueioTurma;
};

type ModalConfirmarExclusaoTurmaProps = {
  /** Turma a excluir. Nulo fecha o modal (mesmo criterio de `aberto`). */
  turma: TurmaAdmin | null;
  aberto: boolean;
  aoFechar: () => void;
  /**
   * Exclui de fato. Rejeita com Error(mensagem) — o modal mostra o texto e
   * permanece aberto. Quando a API recusa com 409 (turma tem alunos), o erro
   * rejeitado carrega `.turmaComAlunos` ({nome, total_alunos}) — o modal entra
   * no estado bloqueado sozinho, sem a vista precisar saber o estagio.
   */
  aoConfirmar: () => Promise<void>;
};

/**
 * Modal "Excluir turma" — mesmo molde do modal de exclusao de aluno (overlay,
 * Esc, clique fora, scroll travado, reset ao abrir), sem formulario.
 *
 * Estagio unico de confirmacao: "Excluir {nome}? Acao sem volta." Se a API
 * recusar com 409 (turma tem alunos), entra no ESTADO BLOQUEADO: mensagem
 * vermelha com o total de alunos e SEM botao de confirmar — a turma so' pode
 * ser excluida depois de esvaziada (mover ou excluir os alunos antes).
 */
export function ModalConfirmarExclusaoTurma({
  turma,
  aberto,
  aoFechar,
  aoConfirmar,
}: ModalConfirmarExclusaoTurmaProps) {
  const [bloqueada, setBloqueada] = useState<BloqueioTurma | null>(null);
  const [erroApi, setErroApi] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const botaoConfirmarRef = useRef<HTMLButtonElement>(null);
  const botaoFecharRef = useRef<HTMLButtonElement>(null);
  const idTitulo = useId();
  const refModal = useFocoPreso(aberto);

  // Espelha (aberto, turma.id) so' pra detectar a transicao durante a
  // renderizacao (padrao oficial "estado derivado de props/estado anterior")
  // e resetar o estado toda vez que o modal abre — nunca comeca bloqueado de
  // uma tentativa anterior, mesmo excluindo outra turma em seguida.
  const chaveAtual = `${aberto}:${turma?.id ?? ""}`;
  const [chaveAnterior, setChaveAnterior] = useState(chaveAtual);
  if (chaveAtual !== chaveAnterior) {
    setChaveAnterior(chaveAtual);
    if (aberto) {
      setBloqueada(null);
      setErroApi(null);
      setEnviando(false);
    }
  }

  // `bloqueada` entra nas deps porque o 409 DESMONTA o botao Confirmar: sem re-rodar,
  // o foco ficaria orfao no <body> e a navegacao por teclado sairia do modal.
  useEffect(() => {
    if (!aberto) return;
    if (bloqueada) {
      botaoFecharRef.current?.focus();
      return;
    }
    botaoConfirmarRef.current?.focus();
  }, [aberto, turma?.id, bloqueada]);

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

  if (!aberto || !turma) return null;

  async function aoClicarConfirmar() {
    setErroApi(null);
    setEnviando(true);
    try {
      await aoConfirmar();
      // Sucesso: quem chama (a vista) fecha e recarrega — nao mexe aqui.
    } catch (causa) {
      const erro = causa as ErroComAlunos;
      if (erro?.turmaBloqueada) {
        // 409: entra no estado bloqueado em vez de mostrar isso como erro generico.
        setBloqueada(erro.turmaBloqueada);
        setErroApi(null);
      } else {
        setErroApi(erro instanceof Error ? erro.message : "Não foi possível excluir a turma.");
      }
    } finally {
      setEnviando(false);
    }
  }

  const total = bloqueada?.total ?? 0;
  const mensagemBloqueio =
    bloqueada?.motivo === "historico"
      ? `A turma ${turma.nome} tem ${total} ${total === 1 ? "aula registrada" : "aulas registradas"}. Turmas com histórico de aula não podem ser excluídas.`
      : `A turma ${turma.nome} tem ${total} ${total === 1 ? "aluno" : "alunos"}. Mova ou exclua os alunos antes de excluir a turma.`;

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
          border: bloqueada ? "1px solid var(--danger)" : "1px solid var(--border)",
          boxShadow: "var(--shadow-raise)",
        }}
      >
        <div className="flex items-center justify-between gap-2">
          <h2
            id={idTitulo}
            className="text-text text-lg font-extrabold"
            style={{ fontFamily: "var(--font-geologica)" }}
          >
            {bloqueada
              ? bloqueada.motivo === "historico"
                ? "Turma com histórico"
                : "Turma com alunos"
              : "Excluir turma"}
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

        {bloqueada ? (
          // role="alert" porque esta mensagem SUBSTITUI a pergunta depois do 409 — sem
          // ele, leitor de tela nao anuncia que a exclusao foi recusada.
          <p
            role="alert"
            className="rounded-xl px-4 py-3 text-sm leading-relaxed font-semibold"
            style={{ background: "var(--danger-bg)", color: "var(--danger-fg)" }}
          >
            {mensagemBloqueio}
          </p>
        ) : (
          <p className="text-text-body text-sm leading-relaxed">
            Excluir a turma {turma.nome}? Esta ação não pode ser desfeita.
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
            ref={botaoFecharRef}
            type="button"
            onClick={aoFechar}
            disabled={enviando}
            className="text-text-body rounded-lg px-4 py-2.5 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-40"
          >
            {bloqueada ? "Fechar" : "Cancelar"}
          </button>
          {/* No estado bloqueado nao ha o que confirmar — so' o botao de fechar. */}
          {!bloqueada && (
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
              {enviando ? "Excluindo..." : "Excluir"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
