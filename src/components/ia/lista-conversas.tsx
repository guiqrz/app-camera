"use client";

import Link from "next/link";
import { useState } from "react";

import { IconLixeira } from "@/components/ui/icons";
import { dataDoTimestamp, formatarDataCurta, horaDoTimestamp } from "@/lib/format";
import type { Conversa } from "@/lib/types";

type ListaConversasProps = {
  conversas: Conversa[];
  /** Conversa aberta agora, destacada na lista. Ausente na tela de lista. */
  conversaAtivaId?: number;
  /** Some da lista depois que o backend confirma. Quem chama recarrega. */
  aoApagar: (conversaId: number) => Promise<void>;
};

/**
 * Conversas do professor, da mais recente pra mais antiga.
 *
 * A data mostrada e' a de `atualizada_em`, nao a de criacao: o professor procura
 * a conversa pelo "mexi nisso ontem", e uma conversa de duas semanas atras que
 * ele retomou hoje precisa aparecer como de hoje — que e' tambem a ordem em que
 * o backend devolve.
 */
export function ListaConversas({
  conversas,
  conversaAtivaId,
  aoApagar,
}: ListaConversasProps) {
  // Confirmacao inline, uma por vez: apagar e' irreversivel, e window.confirm
  // trava o navegador inteiro (mesma decisao de secao-transcricao.tsx).
  const [confirmandoId, setConfirmandoId] = useState<number | null>(null);
  const [apagandoId, setApagandoId] = useState<number | null>(null);

  // Sem texto de vazio: na abertura quem chama ja' esconde a secao inteira
  // quando nao ha conversa, e o campo de perguntar fica ACIMA — um aviso
  // dizendo "pergunte abaixo" apontaria para o lugar errado.
  if (conversas.length === 0) return null;

  const apagar = async (conversaId: number) => {
    setApagandoId(conversaId);
    try {
      await aoApagar(conversaId);
      setConfirmandoId(null);
    } finally {
      setApagandoId(null);
    }
  };

  return (
    <ul className="flex flex-col gap-1.5">
      {conversas.map((conversa) => {
        const ativa = conversa.id === conversaAtivaId;
        const confirmando = confirmandoId === conversa.id;
        const apagando = apagandoId === conversa.id;

        return (
          <li
            key={conversa.id}
            className={`border-border-default bg-surface hover:border-border-strong flex items-center gap-2 rounded-lg border px-3 py-2 transition-colors ${
              ativa ? "border-l-4" : ""
            }`}
            style={ativa ? { borderLeftColor: "var(--primary)" } : undefined}
          >
            {/* Titulo e data na MESMA linha: empilhados, cada card ganhava duas
                alturas de texto e a lista roubava a enfase da abertura. A data
                encolhe (`flex-none`) e quem cede espaco e' o titulo. */}
            <Link
              href={`/ia/${conversa.id}`}
              aria-current={ativa ? "page" : undefined}
              className="flex min-w-0 flex-1 items-baseline gap-2"
            >
              {/* `truncate` porque o titulo e' a primeira pergunta cortada pelo
                  backend e ainda assim pode estourar a largura no celular. */}
              <span className="text-text min-w-0 flex-1 truncate text-[13px] font-bold">
                {conversa.titulo}
              </span>
              <span className="text-text-muted flex-none text-[11px]">
                {formatarDataCurta(dataDoTimestamp(conversa.atualizada_em))} ·{" "}
                {horaDoTimestamp(conversa.atualizada_em)}
              </span>
            </Link>

            {confirmando ? (
              <span className="flex flex-none items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => apagar(conversa.id)}
                  disabled={apagando}
                  className="rounded-lg px-2.5 py-1.5 text-xs font-extrabold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-60"
                  style={{ background: "var(--danger)" }}
                >
                  {apagando ? "Apagando…" : "Apagar"}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmandoId(null)}
                  disabled={apagando}
                  className="border-border-default text-text hover:bg-surface-2 rounded-lg border px-2.5 py-1.5 text-xs font-extrabold transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancelar
                </button>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmandoId(conversa.id)}
                className="hover:bg-surface-2 flex-none rounded-lg p-1.5 transition-colors"
                style={{ color: "var(--danger-fg)" }}
                aria-label={`Apagar a conversa ${conversa.titulo}`}
              >
                <IconLixeira size={15} />
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
