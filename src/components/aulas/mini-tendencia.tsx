/**
 * A mini-tendência do card "Engajamento médio" — `.tendencia` do protótipo.
 *
 * SEGMENTOS RETOS (L), de propósito: ele já pediu de volta o traço anguloso
 * uma vez ("meio quadradinho como estava antes") depois de eu suavizar com
 * Bezier. Não trocar sem ele pedir de novo.
 *
 * `viewBox="0 0 100 40"` com `preserveAspectRatio="none"`: o SVG estica pra
 * largura real do card sem distorcer a espessura do traço — isso é o que o
 * `vector-effect: non-scaling-stroke` garante.
 */
export function MiniTendencia({
  serie,
}: {
  /** Só o número — a ordem é do mais antigo pro mais novo. */
  serie: number[];
}) {
  if (serie.length < 2) return null;

  const minimo = Math.min(...serie);
  const maximo = Math.max(...serie);
  const alcance = maximo - minimo || 1; // evita divisao por zero (serie flat)

  // Y invertido: SVG cresce pra baixo, e o valor mais alto precisa desenhar
  // no topo. `3` a `37` dá 3px de margem em cada ponta (viewBox de 40), pra
  // o traço nao ser cortado nas bordas.
  const pontos = serie.map((valor, i) => {
    const x = (i / (serie.length - 1)) * 100;
    const y = 37 - ((valor - minimo) / alcance) * 34;
    return { x, y };
  });

  const linha = pontos.map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" L ");
  const area = `${linha} L 100 40 L 0 40 Z`;

  return (
    <svg
      className="block h-[52px] w-full"
      viewBox="0 0 100 40"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {/* SEMPRE ciano (`--grafico-baixo`), sobe ou desce — ele pediu em
          14/08. O protótipo trocava entre roxo/ciano conforme a direção;
          aqui a cor é fixa, e só o selo de variação ao lado ("+3 pts",
          "-61 pts") ainda diz se melhorou ou piorou. */}
      <defs>
        <linearGradient id="gradTend" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--grafico-baixo)" stopOpacity="0.3" />
          <stop offset="100%" stopColor="var(--grafico-baixo)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path fill="url(#gradTend)" stroke="none" d={`M ${area}`} />
      <path
        fill="none"
        stroke="var(--grafico-baixo)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
        d={`M ${linha}`}
      />
    </svg>
  );
}
