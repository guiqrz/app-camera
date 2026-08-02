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

  if (conversas.length === 0) {
    return (
      <p className="text-text-muted px-1 py-6 text-sm leading-relaxed">
        Nenhuma conversa ainda. Faça a primeira pergunta abaixo.
      </p>
    );
  }

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
    <ul className="flex flex-col gap-2">
      {conversas.map((conversa) => {
        const ativa = conversa.id === conversaAtivaId;
        const confirmando = confirmandoId === conversa.id;
        const apagando = apagandoId === conversa.id;

        return (
          <li
            key={conversa.id}
            className={`border-border-default bg-surface flex items-center gap-2 rounded-xl border px-3 py-2.5 transition-colors ${
              ativa ? "border-l-4" : ""
            }`}
            style={ativa ? { borderLeftColor: "var(--primary)" } : undefined}
          >
            <Link
              href={`/ia/${conversa.id}`}
              aria-current={ativa ? "page" : undefined}
              className="min-w-0 flex-1"
            >
              {/* `truncate` porque o titulo e' a primeira pergunta cortada pelo
                  backend e ainda assim pode estourar a largura no celular. */}
              <span className="text-text block truncate text-sm font-extrabold">
                {conversa.titulo}
              </span>
              <span className="text-text-muted text-xs">
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
                className="hover:bg-surface-2 flex-none rounded-lg p-2 transition-colors"
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
