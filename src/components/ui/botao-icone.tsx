import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";

type BotaoIconePropsComuns = {
  /** Obrigatorio: o botao mostra so' um icone, sem texto visivel. */
  rotulo: string;
  /** O icone. */
  children: ReactNode;
  /** Lado visual do botao em px (o padrao, 28, e' o tamanho mais usado no app). */
  tamanho?: number;
  /**
   * Lado da area de toque em px. Padrao 44 (o piso do PRODUCT.md).
   *
   * Reduza somente onde 44 nao cabe: em pares de botoes colados dentro de um
   * container estreito, duas areas de 44px se sobrepoem e uma rouba o clique da
   * outra — pior que um alvo menor. Nesses casos use o maior valor que ainda
   * separe os vizinhos (ver `alvo` em painel-materias e grade-semanal).
   */
  alvo?: 44 | 40 | 36 | 32;
  /** Cor do icone. Aceita `var(--token)`. */
  cor?: string;
  /** Fundo do botao. Sem valor, fica transparente. */
  fundo?: string;
  /** Borda CSS completa, ex.: `"1.5px solid var(--ok)"`. */
  borda?: string;
  /** Arredondamento visual. `"cheio"` para bolinha. */
  raio?: "lg" | "cheio";
  className?: string;
};

type BotaoIconeProps = BotaoIconePropsComuns &
  (
    | {
        como?: "botao";
        aoClicar: () => void;
        href?: never;
        /** Repassado ao <button> (ex.: seletor de cor com aria-pressed). */
        pressionado?: boolean;
        /** Trava o botao durante um envio em curso. */
        desabilitado?: boolean;
      }
    | {
        como: "link";
        href: string;
        aoClicar?: never;
        pressionado?: never;
        desabilitado?: never;
      }
  );

/**
 * Botao de icone com area de toque de 44px e visual inalterado.
 *
 * Existe porque os botoes de icone do app (editar, excluir, fechar modal,
 * confirmar) mediam de 24 a 32px — abaixo do piso de 44px que o proprio
 * PRODUCT.md fixa — e cada um reescrevia as mesmas classes soltas, sem nenhum
 * componente compartilhado. Duas copias identicas da mesma string apareciam 4 e
 * 5 vezes no codigo.
 *
 * A area cresce por um pseudo-elemento centrado (`before:`), nao pelo tamanho do
 * botao: o icone e o fundo continuam do tamanho que o desenho pede, e o alvo
 * invisivel se estende ao redor. Assim o dedo acerta sem que a tela mude de
 * aparencia.
 *
 * ATENCAO em pares de botoes vizinhos (confirmar/cancelar): as areas invisiveis
 * podem se sobrepor e uma roubar o clique da outra. Onde eles ficam lado a lado,
 * o `gap` do container precisa somar ao menos `44 - tamanho` px.
 */
/* Classes por tamanho de alvo, escritas literalmente: o Tailwind varre o
   codigo-fonte estaticamente, entao uma classe montada por interpolacao
   (`before:h-[${n}px]`) nunca seria gerada. */
const CLASSES_ALVO: Record<NonNullable<BotaoIconeProps["alvo"]>, string> = {
  44: "before:h-[44px] before:w-[44px]",
  40: "before:h-[40px] before:w-[40px]",
  36: "before:h-[36px] before:w-[36px]",
  32: "before:h-[32px] before:w-[32px]",
};

export function BotaoIcone({
  rotulo,
  children,
  tamanho = 28,
  alvo = 44,
  cor,
  fundo,
  borda,
  raio = "lg",
  className = "",
  ...resto
}: BotaoIconeProps) {
  const classes = [
    "relative inline-flex flex-none items-center justify-center transition-colors",
    // Area de toque invisivel, centrada no botao (WCAG 2.2 AA, criterio 2.5.8
    // "Target Size"), independente do tamanho visual do icone.
    "before:absolute before:top-1/2 before:left-1/2 before:-translate-x-1/2 before:-translate-y-1/2 before:content-['']",
    CLASSES_ALVO[alvo],
    raio === "cheio" ? "rounded-full" : "rounded-lg",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const estilo: CSSProperties = {
    height: tamanho,
    width: tamanho,
    color: cor,
    background: fundo,
    border: borda,
  };

  if (resto.como === "link") {
    return (
      <Link href={resto.href} aria-label={rotulo} className={classes} style={estilo}>
        {children}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={resto.aoClicar}
      aria-label={rotulo}
      aria-pressed={resto.pressionado}
      disabled={resto.desabilitado}
      className={classes}
      style={estilo}
    >
      {children}
    </button>
  );
}
