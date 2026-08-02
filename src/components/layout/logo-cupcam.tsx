type LogoCupcamProps = {
  /** Lado do desenho em pixels. Padrao 19, o tamanho usado no menu. */
  size?: number;
  className?: string;
};

/**
 * Marca do CUPCAM: a xicara vista de frente, com os raios da camera.
 *
 * Em SVG e nao no PNG de `public/`: o desenho original e' preto solido, e no
 * tema escuro viraria uma mancha invisivel. Aqui tudo herda `currentColor`,
 * entao a marca acompanha a cor do menu nos dois temas — a mesma regra dos
 * icones em `icons.tsx`.
 *
 * Usada SO' no menu lateral. O mascote do assistente e' outro desenho
 * (`components/ia/mascote-cup.tsx`) e nao se confunde com este.
 */
export function LogoCupcam({ size = 19, className }: LogoCupcamProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
      focusable={false}
    >
      {/* Os tres raios: o do meio reto, os das pontas inclinados pra fora. */}
      <rect x="45.5" y="6" width="9" height="26" rx="1" fill="currentColor" />
      <rect
        x="20.5"
        y="14"
        width="9"
        height="22"
        rx="1"
        fill="currentColor"
        transform="rotate(-38 25 25)"
      />
      <rect
        x="70.5"
        y="14"
        width="9"
        height="22"
        rx="1"
        fill="currentColor"
        transform="rotate(38 75 25)"
      />

      {/* A lente, no centro da boca da xicara. */}
      <circle cx="50" cy="52" r="13.5" fill="currentColor" />

      {/* O corpo: meia-lua aberta em cima, como uma xicara vista de frente. */}
      <path
        d="M28 56 a22 22 0 0 0 44 0"
        stroke="currentColor"
        strokeWidth="11"
        strokeLinecap="butt"
      />

      {/* A alca, a' direita. */}
      <path
        d="M73 58 a7.5 7.5 0 1 1 0 11"
        stroke="currentColor"
        strokeWidth="5.5"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}
