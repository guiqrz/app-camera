/**
 * Cup — o mascote do assistente (v2).
 *
 * Uma xicara de perfil com olhos, no gradiente da marca (violeta -> ciano). E'
 * SVG e nao imagem porque aparece de 18px (item do menu) a 185px (abertura da
 * tela): em bitmap seria preciso um arquivo por tamanho, e nenhum ficaria
 * nitido nos dois extremos.
 *
 * A v2 traz do render 3D o corpo BOJUDO, a alca grossa e a iridescencia (as
 * faixas de brilho e a luz que sobe do pe'). O visor escuro que o render tinha
 * foi removido de proposito: o retangulo no meio do corpo pesava e competia com
 * a silhueta.
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
   * Liga o balanco, a piscada e a luz que atravessa o corpo. Desligado por
   * padrao: no menu lateral e no avatar das mensagens o movimento so'
   * distrairia de ler.
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
  const idBrilho = `cup-brilho-${id}`;
  const idPe = `cup-pe-${id}`;
  const idLuz = `cup-luz-${id}`;
  const idRecorte = `cup-recorte-${id}`;

  // O contorno do corpo aparece duas vezes: como preenchimento e como recorte
  // dos brilhos. Uma constante evita que as duas saiam de sincronia.
  const contornoCorpo = "M18 38 h64 v14 a32 30 0 0 1 -64 0 z";

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
        {/* Corpo: a diagonal roxo -> CIANO do render, com um violeta e um azul
            no meio pra evitar a passagem direta que acinzenta.

            Aqui NAO dao' pra usar os `--brand-grad-*`: aquela rampa vai de
            violeta pra violeta escuro (`--violet-900`, #2b0052 no tema claro),
            que e' a cor de titulo hero — no corpo bojudo da v2 ela pinta uma
            xicara roxa escura, e a iridescencia (que e' o ponto da v2) some.
            Os tokens proprios abaixo carregam a rampa violeta -> ciano do
            render, e trocam por tema pelo mesmo motivo dos `--brand-*`: no
            escuro o fim precisa clarear, senao a base se dissolve no fundo. */}
        <linearGradient id={idCorpo} x1="12%" y1="4%" x2="88%" y2="96%">
          <stop offset="0%" stopColor="var(--cup-corpo-1)" />
          <stop offset="38%" stopColor="var(--cup-corpo-2)" />
          <stop offset="72%" stopColor="var(--cup-corpo-3)" />
          <stop offset="100%" stopColor="var(--cup-corpo-4)" />
        </linearGradient>

        {/* Aro e alca: mesma familia, um pouco mais claros — sao as partes que
            pegam luz de topo no render. */}
        <linearGradient id={idAro} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="var(--cup-aro-1)" />
          <stop offset="55%" stopColor="var(--cup-aro-2)" />
          <stop offset="100%" stopColor="var(--cup-aro-3)" />
        </linearGradient>

        {/* Brilho de topo: a faixa clara que corre pela borda de cima do corpo.
            Vertical, so' nos primeiros 30%. */}
        <linearGradient id={idBrilho} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.55" />
          <stop offset="60%" stopColor="#ffffff" stopOpacity="0.1" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>

        {/* Luz que sobe do pe' da xicara: no render o vidro acende por baixo,
            e' o que tira o aspecto de plastico chapado. */}
        <radialGradient id={idPe} cx="42%" cy="96%" r="60%">
          <stop offset="0%" stopColor="#c084fc" stopOpacity="0.55" />
          <stop offset="55%" stopColor="#a855f7" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
        </radialGradient>

        {/* Recorta os brilhos pelo contorno do corpo: sem isto eles vazam pros
            lados e a silhueta perde o recorte. */}
        <clipPath id={idRecorte}>
          <path d={contornoCorpo} />
        </clipPath>

        {/* A faixa de luz que atravessa o corpo — o mesmo efeito do titulo.
            NAO E' BRANCO: branco puro estourava e virava um feixe duro. A faixa
            carrega as cores da marca LAVADAS (o roxo e o azul claros), entao o
            efeito e' o gradiente clareando ao passar, e nao uma luz por cima. */}
        <linearGradient id={idLuz} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#c9a6f0" stopOpacity="0" />
          <stop offset="26%" stopColor="#c9a6f0" stopOpacity="0.06" />
          <stop offset="42%" stopColor="#d9bdf5" stopOpacity="0.15" />
          <stop offset="52%" stopColor="#cfe0fa" stopOpacity="0.2" />
          <stop offset="62%" stopColor="#a9d4f5" stopOpacity="0.15" />
          <stop offset="78%" stopColor="#a9d4f5" stopOpacity="0.06" />
          <stop offset="100%" stopColor="#a9d4f5" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* ENQUADRAMENTO. O desenho ia de x=18 a x=100,8, ou seja a alca VAZAVA
          0,8 do viewBox (0..100) e aparecia cortada em qualquer lugar que
          recorte (captura de tela, container com overflow).
          A correcao vai num `transform` de grupo, e nao reescrevendo as ~10
          coordenadas a mao: uma conta so', e as pecas nao podem sair de
          sincronia entre si. O `scale` reduz e traz a largura pra dentro; o
          `translate` recentra o resultado.

          O ajuste vive num grupo EXTERNO, e nao no `.cup-balanca`: o CSS anima
          `transform` naquela classe (a rotacao do balanco), e a animacao
          SOBRESCREVE o atributo `transform` do mesmo elemento — a escala
          simplesmente sumiria. Com dois grupos, cada `transform` e' de um dono. */}
      <g transform="translate(4.8 12) scale(.769)">
        <g className={animado ? "cup-balanca" : undefined}>
          {/* ALCA: anel grosso, desenhado ANTES do corpo pra que o corpo cubra
              a emenda — no render ela nasce por tras. */}
          <path
            d="M80 50 a13 13 0 1 1 -1 20"
            stroke={`url(#${idAro})`}
            strokeWidth="7.5"
            strokeLinecap="round"
          />

          {/* CORPO bojudo: lados retos ate' a metade e uma barriga larga
              embaixo, como a referencia. */}
          <path d={contornoCorpo} fill={`url(#${idCorpo})`} />

          {/* Brilhos, presos ao contorno do corpo. */}
          <g clipPath={`url(#${idRecorte})`}>
            <path d={contornoCorpo} fill={`url(#${idPe})`} />
            {/* Faixa clara da borda de cima. */}
            <rect x="18" y="38" width="64" height="16" fill={`url(#${idBrilho})`} />
            {/* Reflexo vertical da esquerda: e' o que le' como VIDRO, e nao
                como pintura. Estreito e bem transparente. */}
            <ellipse cx="27" cy="60" rx="4" ry="15" fill="#ffffff" opacity="0.16" />

            {/* A faixa de luz. Inclinada (-18deg) porque luz batendo num corpo
                curvo nunca corre reta; larga o bastante (26) pra cobrir o corpo
                com suavidade nas pontas. Comeca FORA do desenho, a' esquerda.

                A inclinacao mora num grupo SEPARADO da faixa: o CSS anima
                `transform` na classe `.cup-brilho`, e os dois no mesmo elemento
                brigariam — a animacao venceria e o `skewX` sumiria (o mesmo
                conflito do grupo de enquadramento, la' em cima). */}
            <g transform="skewX(-18)">
              <rect
                className={animado ? "cup-brilho" : undefined}
                x="0"
                y="28"
                width="26"
                height="56"
                fill={`url(#${idLuz})`}
              />
            </g>
          </g>

          {/* ARO: elipse aberta no topo. `stroke` e nao `fill` porque a boca da
              xicara e' vazada no render. */}
          <ellipse
            cx="50"
            cy="38"
            rx="32"
            ry="7.5"
            stroke={`url(#${idAro})`}
            strokeWidth="4.5"
          />
          {/* Interior da boca. Encolhido e clareado em relacao ao render: a
              primeira versao virava uma mancha escura larga no topo, que lia
              como cafe' sujo em vez de sombra interna. */}
          <ellipse cx="50" cy="38.6" rx="26" ry="4" fill="#6d5aa8" opacity="0.2" />
          {/* Risco de luz no aro, so' na metade esquerda. */}
          <path
            d="M24 35.5 a29 6 0 0 1 26 -3.6"
            stroke="#ffffff"
            strokeWidth="1.6"
            strokeLinecap="round"
            opacity="0.5"
          />

          {/* OLHOS: tracos curvos virados pra cima, flutuando direto no corpo
              (sem visor). Mais separados e mais abertos que a v1, acompanhando
              o corpo mais largo. Branco puro — sem o fundo escuro atras, um
              azul palido perderia forca contra o corpo. */}
          <path
            className={animado ? "cup-olho" : undefined}
            d="M36 63 q5.5 -6.5 11 0"
            stroke="#ffffff"
            strokeWidth="3.8"
            strokeLinecap="round"
          />
          <path
            className={animado ? "cup-olho" : undefined}
            d="M53 63 q5.5 -6.5 11 0"
            stroke="#ffffff"
            strokeWidth="3.8"
            strokeLinecap="round"
            // Atraso minimo entre os dois: piscar em uniformidade exata parece
            // mecanico.
            style={{ animationDelay: "0.06s" }}
          />
        </g>
      </g>
    </svg>
  );
}
