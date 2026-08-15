"use client";

import { useState, type ReactNode } from "react";

import { IconSeta } from "@/components/ui/icons";

type Props = {
  /** Nome do bloco na barra de titulo. */
  titulo: string;
  /** Contagem discreta ao lado do titulo ("18", "36 trechos"). */
  conta?: ReactNode;
  /** Quantas das 12 colunas o bloco ocupa no computador. */
  colunas?: number;
  /** Blocos longos (transcricao) nascem fechados. */
  abertoInicial?: boolean;
  /**
   * Marca o bloco como o da SUGESTAO da IA — o unico com tratamento visual
   * proprio (vidro, borda em degrade e brilho na quina).
   *
   * O estilo vive no CSS (`[data-bloco="sugestao"]` em globals.css), e nao em
   * classes aqui, porque depende de dois pseudo-elementos: `::before` desenha
   * a borda em degrade por mascara — que `border-color` sozinho nao faz, so'
   * aceita cor chapada — e `::after` o brilho difuso.
   */
  destaque?: boolean;
  children: ReactNode;
};

/**
 * Um bloco da tela de uma aula — o `.bloco` do prototipo.
 *
 * O cabecalho e' um `<button>` de verdade, e nao uma `<div>` com `onClick`: da'
 * de graca o Enter/Espaco, o foco por teclado e o anuncio de "botao" no leitor
 * de tela.
 *
 * A largura vai por `--col`, lida pela grade de 12 colunas do pai. O padrao e'
 * 12 (linha inteira), entao um bloco novo que ninguem posicionou cai inteiro
 * numa linha em vez de quebrar o arranjo.
 */
export function BlocoColapsavel({
  titulo,
  conta,
  colunas = 12,
  abertoInicial = true,
  destaque = false,
  children,
}: Props) {
  const [aberto, setAberto] = useState(abertoInicial);

  return (
    <section
      className="bg-surface border-border-default flex flex-col overflow-hidden rounded-[12px] border"
      style={
        {
          boxShadow: "var(--shadow-card)",
          "--col": colunas,
        } as React.CSSProperties
      }
      data-aberto={aberto ? "sim" : "nao"}
      data-bloco={destaque ? "sugestao" : undefined}
    >
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        className="flex w-full cursor-pointer items-center gap-[10px] px-[17px] pt-[15px] pb-[11px] text-left"
      >
        <h2
          className="text-text text-[16px] font-semibold"
          style={{ letterSpacing: "-0.16px" }}
        >
          {titulo}
        </h2>
        {conta && (
          <span
            className="text-text-muted text-[12.5px] tabular-nums"
            style={{ fontWeight: 400 }}
          >
            {conta}
          </span>
        )}
        {/* A seta gira pra apontar pro lado que a acao leva. */}
        <span
          className={`text-text-muted ml-auto flex-none transition-transform duration-200 ${
            aberto ? "rotate-180" : ""
          }`}
          aria-hidden
        >
          <IconSeta size={15} />
        </span>
      </button>

      {/* `hidden` de verdade, e nao altura zero: conteudo invisivel mas
          presente continuaria sendo lido em voz alta e tabulavel.

          `flex-1 min-h-0`: com `items-stretch` no grid pai, a `<section>`
          estica pra' bater com o vizinho mais alto — mas so' o grafico e a
          chamada tem par na mesma linha (os blocos de largura cheia abaixo
          nao esticam por falta de vizinho, entao o flex neles e' inerte). O
          `min-h-0` evita que o filho force a altura de volta pro conteudo
          minimo, que anularia o stretch. */}
      {aberto && (
        <div className="flex min-h-0 flex-1 flex-col px-[17px] pt-[3px] pb-[16px]">
          {children}
        </div>
      )}
    </section>
  );
}
