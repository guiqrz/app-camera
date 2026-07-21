import type { PontoLinhaDoTempo } from "@/lib/types";

type GraficoProps = {
  pontos: PontoLinhaDoTempo[];
};

/**
 * Grafico da atencao da turma ao longo da aula, minuto a minuto.
 *
 * Desenhado em SVG puro, sem biblioteca de graficos: e' uma unica curva com
 * eixos simples, e uma dependencia de charting seria peso desnecessario. A
 * viewBox e' fixa e o SVG escala com o container (preserveAspectRatio none no
 * eixo X para preencher a largura).
 */
export function GraficoLinhaTempo({ pontos }: GraficoProps) {
  // Estado vazio: aula sem leitura ainda nao tem curva para desenhar.
  if (pontos.length === 0) {
    return (
      <div className="border-border-default text-text-muted flex h-56 items-center justify-center rounded-xl border border-dashed text-sm">
        Esta aula ainda não tem leituras de engajamento.
      </div>
    );
  }

  // Coordenadas do desenho. Margens deixam espaco para os rotulos dos eixos.
  const L = 40; // margem esquerda (rotulos do eixo Y)
  const R = 12;
  const T = 12;
  const B = 28; // margem inferior (rotulos do eixo X)
  const W = 600;
  const H = 240;
  const larguraUtil = W - L - R;
  const alturaUtil = H - T - B;

  // Um so' ponto nao forma linha: repete para virar um segmento reto.
  const dados = pontos.length === 1 ? [pontos[0], pontos[0]] : pontos;
  const ultimoMinuto = dados[dados.length - 1].minuto || 1;

  const x = (minuto: number) => L + (minuto / ultimoMinuto) * larguraUtil;
  const y = (pct: number) => T + (1 - pct / 100) * alturaUtil;

  const coordenadas = dados.map((p) => ({ px: x(p.minuto), py: y(p.atencao_pct) }));

  // Caminho da linha e caminho da area preenchida abaixo dela.
  const linha = coordenadas
    .map((c, i) => `${i === 0 ? "M" : "L"} ${c.px.toFixed(1)} ${c.py.toFixed(1)}`)
    .join(" ");

  const area =
    `M ${coordenadas[0].px.toFixed(1)} ${(H - B).toFixed(1)} ` +
    coordenadas.map((c) => `L ${c.px.toFixed(1)} ${c.py.toFixed(1)}`).join(" ") +
    ` L ${coordenadas[coordenadas.length - 1].px.toFixed(1)} ${(H - B).toFixed(1)} Z`;

  const linhasGrade = [0, 25, 50, 75, 100];

  // Rotulos do eixo X sem aglomerar: no maximo ~6, espacados por igual.
  const passo = Math.max(1, Math.ceil(dados.length / 6));
  const marcasX = dados.filter((_, i) => i % passo === 0 || i === dados.length - 1);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-56 w-full"
      role="img"
      aria-label={`Grafico da atencao da turma ao longo de ${pontos.length} minutos de aula.`}
      preserveAspectRatio="none"
    >
      {/* Linhas de grade horizontais + rotulos do eixo Y */}
      {linhasGrade.map((pct) => (
        <g key={pct}>
          <line
            x1={L}
            x2={W - R}
            y1={y(pct)}
            y2={y(pct)}
            stroke="var(--border)"
            strokeWidth={1}
          />
          <text
            x={L - 8}
            y={y(pct) + 3}
            textAnchor="end"
            fontSize={10}
            fill="var(--text-muted)"
          >
            {pct}%
          </text>
        </g>
      ))}

      {/* Rotulos do eixo X (horarios) */}
      {marcasX.map((p) => (
        <text
          key={p.minuto}
          x={x(p.minuto)}
          y={H - 8}
          textAnchor="middle"
          fontSize={10}
          fill="var(--text-muted)"
        >
          {p.horario}
        </text>
      ))}

      <defs>
        <linearGradient id="preenchimento-atencao" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.25" />
          <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
        </linearGradient>
      </defs>

      <path d={area} fill="url(#preenchimento-atencao)" />
      <path
        d={linha}
        fill="none"
        stroke="var(--primary)"
        strokeWidth={2.5}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
