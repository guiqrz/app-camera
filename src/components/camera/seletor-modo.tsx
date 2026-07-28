"use client";

import type { ReactNode } from "react";

import { IconAulas, IconRelatorios, IconRelogio } from "@/components/ui/icons";
import type { ModoCamera, ModoCameraInfo } from "@/lib/types";

/**
 * Um icone por modo. Fica no frontend (e nao vem da API junto do rotulo)
 * porque icone e' escolha visual desta tela, nao regra de negocio do backend.
 */
const ICONES: Record<ModoCamera, ReactNode> = {
  aula: <IconAulas size={20} />,
  descanso: <IconRelogio size={20} />,
  prova: <IconRelatorios size={20} />,
};

type SeletorModoProps = {
  /** Modos disponiveis, com rotulo e resumo vindos do backend. */
  modos: ModoCameraInfo[];
  /**
   * Modo em vigor NA CAMERA (vem do polling), nao o ultimo clicado. E' ele que
   * pinta o cartao ativo — o professor precisa ver o que esta valendo de fato.
   */
  ativo: ModoCamera;
  /**
   * Modo clicado que ainda nao foi confirmado pelo polling, ou null. Some
   * sozinho quando `ativo` alcanca o valor pedido.
   */
  pendente?: ModoCamera | null;
  /** Desliga os cartoes (troca em curso, ou camera fora do ar). */
  desabilitado?: boolean;
  aoEscolher: (modo: ModoCamera) => void;
};

/**
 * Cartoes de modo da camera.
 *
 * Cartao em vez de menu suspenso: os tres modos ficam visiveis de uma vez, com
 * o resumo do que cada um faz — uma feature nova escondida atras de um select
 * nao seria descoberta. Renderiza como radiogroup pra leitor de tela anunciar
 * "1 de 3" e as setas navegarem entre as opcoes.
 */
export function SeletorModo({
  modos,
  ativo,
  pendente = null,
  desabilitado = false,
  aoEscolher,
}: SeletorModoProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Modo da câmera"
      className="grid gap-3 sm:grid-cols-3"
    >
      {modos.map((modo) => {
        const selecionado = modo.id === ativo;
        const aguardando = modo.id === pendente && !selecionado;

        return (
          <button
            key={modo.id}
            type="button"
            role="radio"
            aria-checked={selecionado}
            disabled={desabilitado}
            onClick={() => aoEscolher(modo.id)}
            className="flex flex-col items-start gap-1.5 rounded-2xl border p-4 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60"
            style={{
              // O cartao ativo usa a cor da marca; os outros ficam neutros.
              borderColor: selecionado ? "var(--primary)" : "var(--border)",
              // --surface-soft e' a "secao tingida" do design system, definida
              // nos dois temas — o cartao ativo fica destacado sem virar bloco
              // solido da marca, que competiria com o botao Desligar.
              background: selecionado ? "var(--surface-soft)" : "var(--surface)",
              // Anel extra no ativo: cor sozinha nao pode ser o unico sinal de
              // selecao (daltonismo) — o texto "Ativo" abaixo reforca.
              boxShadow: selecionado ? "inset 0 0 0 1px var(--primary)" : "none",
            }}
          >
            <span
              className="flex items-center gap-2 text-sm font-extrabold"
              style={{ color: selecionado ? "var(--primary)" : "var(--text)" }}
            >
              <span aria-hidden>{ICONES[modo.id]}</span>
              {modo.rotulo}
            </span>

            <span className="text-text-muted text-xs leading-relaxed">{modo.resumo}</span>

            {/* Estado em texto, nao so' em cor. "Aplicando" e' honesto: a troca
                so' vale quando o backend le o comando, alguns segundos depois. */}
            {selecionado && (
              <span className="text-[11px] font-extrabold tracking-wide uppercase" style={{ color: "var(--primary)" }}>
                Ativo
              </span>
            )}
            {aguardando && (
              <span className="text-[11px] font-extrabold tracking-wide uppercase" style={{ color: "var(--warn-fg)" }}>
                Aplicando…
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
