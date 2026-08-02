/**
 * Cup — o mascote do assistente.
 *
 * Uma xicara de perfil com olhos, no gradiente da marca (violeta -> ciano, o
 * mesmo `--grad-brand` do design system). E' SVG e nao imagem porque aparece
 * de 18px (item do menu) a 132px (abertura da tela): em bitmap seria preciso
 * um arquivo por tamanho, e nenhum ficaria nitido nos dois extremos.
 *
 * Os gradientes exigem `id` unico por instancia. Duas xicaras na mesma pagina
 * com o mesmo id fazem o navegador resolver as duas para a PRIMEIRA definicao
 * — na pratica, a que for removida do DOM leva a cor da outra junto. Por isso
 * o `useId`, e nao uma constante.
 */

"use client";

import { useId } from "react";

type MascoteCupProps = {
  /** Lado do desenho em pixels. */
  size?: number;
  /**
   * Liga o balanco e a piscada. Desligado por padrao: no menu lateral e no
   * avatar das mensagens o movimento so' distrairia de ler.
   */
  animado?: boolean;
  className?: string;
  /**
   * Rotulo para leitor de tela. Sem ele o desenho e' decorativo — que e' o
   * caso quando ha o texto "Cup AI" do lado.
   */
  titulo?: string;
};

export function MascoteCup({
  size = 24,
  animado = false,
  className,
  titulo,
}: MascoteCupProps) {
  // `useId` gera algo como ":r3:" — valido em id de SVG e unico por instancia.
  const id = useId();
  const idCorpo = `cup-corpo-${id}`;
  const idAro = `cup-aro-${id}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role={titulo ? "img" : undefined}
      aria-label={titulo}
      aria-hidden={titulo ? undefined : true}
      focusable={false}
      // `visible` porque a alca passa da caixa do viewBox no eixo X.
      style={{ overflow: "visible" }}
    >
      <defs>
        <linearGradient id={idCorpo} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#b57bff" />
          <stop offset="50%" stopColor="var(--violet-500)" />
          <stop offset="100%" stopColor="var(--violet-900)" />
        </linearGradient>
        <linearGradient id={idAro} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="var(--violet-400)" />
          <stop offset="100%" stopColor="var(--cyan-500)" />
        </linearGradient>
      </defs>

      <g className={animado ? "cup-balanca" : undefined}>
        {/* Alca: arco maior que meia-volta (large-arc-flag = 1), senao a curva
            fica rasa demais e some atras do corpo. */}
        <path
          d="M75 47 a10 10 0 1 1 -2 15"
          stroke={`url(#${idAro})`}
          strokeWidth="6.5"
          strokeLinecap="round"
        />

        {/* Corpo: laterais retas em cima, base arredondada — a proporcao que
            separa xicara de caneca. */}
        <path d="M25 40 h52 v14 a26 22 0 0 1 -52 0 z" fill={`url(#${idCorpo})`} />

        {/* Boca vazia: so' o aro, sem liquido dentro. */}
        <ellipse
          cx="51"
          cy="40"
          rx="26"
          ry="6"
          stroke={`url(#${idAro})`}
          strokeWidth="4"
        />

        {/* Olhos: traco curvo virado pra cima. A piscada os achata no eixo Y. */}
        <path
          className={animado ? "cup-olho" : undefined}
          d="M40 57 q4.5 -5.5 9 0"
          stroke="#fff"
          strokeWidth="3.4"
          strokeLinecap="round"
        />
        <path
          className={animado ? "cup-olho" : undefined}
          d="M54 57 q4.5 -5.5 9 0"
          stroke="#fff"
          strokeWidth="3.4"
          strokeLinecap="round"
          // Atraso minimo entre os dois: piscar em uniformidade exata parece
          // mecanico.
          style={{ animationDelay: "0.06s" }}
        />
      </g>
    </svg>
  );
}
