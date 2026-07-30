import { aparenciaDaCorMateria } from "@/lib/format";
import type { CorMateria, PeriodoSemMedicao, PontoLinhaDoTempo } from "@/lib/types";

type GraficoProps = {
  pontos: PontoLinhaDoTempo[];
  /** Trechos em Descanso/Prova, marcados como faixa. Aula normal: vazio. */
  periodos?: PeriodoSemMedicao[];
};

/** Frase que nomeia os modos de um ou mais periodos ("Descanso", "Descanso e Prova"). */
function listarRotulos(periodos: PeriodoSemMedicao[]): string {
  const rotulos = [...new Set(periodos.map((p) => p.rotulo))];
  if (rotulos.length === 1) return rotulos[0];
  return `${rotulos.slice(0, -1).join(", ")} e ${rotulos[rotulos.length - 1]}`;
}

/**
 * Grafico da atencao da turma ao longo da aula, minuto a minuto.
 *
 * Desenhado em SVG puro, sem biblioteca de graficos: e' uma unica curva com
 * eixos simples, e uma dependencia de charting seria peso desnecessario. A
 * viewBox e' fixa e o SVG escala com o container (preserveAspectRatio none no
 * eixo X para preencher a largura).
 *
 * Vaos (`periodos`): fora do modo Aula a atencao nao e' medida, entao aqueles
 * minutos simplesmente NAO existem em `pontos`. A curva e' cortada nas bordas do
 * periodo e o trecho recebe uma faixa com o nome do modo. Ligar os dois lados
 * desenharia uma queda de atencao que ninguem mediu — numero inventado, pior que
 * a ausencia (ver PRODUCT.md, "Sem dado e' uma resposta").
 */
export function GraficoLinhaTempo({ pontos, periodos = [] }: GraficoProps) {
  // Aula inteira sem medicao: nao ha curva NEM faixa util (um grafico coberto de
  // ponta a ponta e' so' um retangulo colorido). Explica o motivo em texto.
  if (pontos.length === 0 && periodos.length > 0) {
    const inicio = periodos[0].horario_inicio;
    const fim = periodos[periodos.length - 1].horario_fim;
    return (
      <div className="border-border-default text-text-muted flex h-56 flex-col items-center justify-center gap-1 rounded-xl border border-dashed px-6 text-center text-sm">
        <p>
          Esta aula esteve em{" "}
          <strong className="text-text font-semibold">{listarRotulos(periodos)}</strong> das{" "}
          {inicio} às {fim}.
        </p>
        <p>A atenção não é medida nesse modo.</p>
      </div>
    );
  }

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

  // O eixo X vai ate o fim do ultimo VAO, nao ate o ultimo ponto medido: a aula
  // que termina em Descanso tem seu ultimo ponto ANTES do vao, e escalar so' pelos
  // pontos comprimiria a faixa final a zero — ela seria descartada e o professor
  // ficaria sem explicacao nenhuma pro fim da curva.
  const ultimoMinuto =
    Math.max(
      dados[dados.length - 1].minuto,
      ...periodos.map((p) => p.minuto_fim),
    ) || 1;

  const x = (minuto: number) => L + (minuto / ultimoMinuto) * larguraUtil;
  const y = (pct: number) => T + (1 - pct / 100) * alturaUtil;

  // Periodo de duracao zero nao tem area pra pintar (o proprio backend nao gera
  // periodo repetido, mas dois comandos no mesmo minuto cairiam aqui).
  const faixas = periodos
    .filter((p) => p.minuto_fim > p.minuto_inicio)
    .map((p) => {
      const px = x(Math.max(0, p.minuto_inicio));
      const largura = x(Math.min(ultimoMinuto, p.minuto_fim)) - px;
      return { ...p, px, largura };
    })
    .filter((f) => f.largura > 0);

  // Corta a curva nos vaos: cada trecho continuo vira um <path> proprio, entao
  // nada atravessa a faixa.
  //
  // O corte olha o INTERVALO entre dois pontos vizinhos, nao o ponto sozinho: os
  // minutos do vao simplesmente nao existem em `pontos` (sem medicao, sem
  // leitura), entao o caso normal e' justamente ter ponto so' nas BORDAS — 0 e 3
  // com um Descanso de 0 a 3. Testar apenas "o ponto esta dentro?" nao acha nada
  // pra cortar e a linha atravessa a faixa inteira, que era o bug original.
  const cruzaVao = (minutoAnterior: number, minuto: number) =>
    periodos.some(
      (p) => minutoAnterior <= p.minuto_inicio && minuto >= p.minuto_fim,
    );

  // Ponto DENTRO de um periodo nao deveria existir; se existir e' descartado —
  // a faixa manda, e desenhar ali seria mostrar atencao "medida" no vao.
  const dentroDeVao = (minuto: number) =>
    periodos.some((p) => minuto > p.minuto_inicio && minuto < p.minuto_fim);

  const segmentos: { px: number; py: number }[][] = [];
  let atual: { px: number; py: number }[] = [];
  let minutoAnterior: number | null = null;
  for (const ponto of dados) {
    if (dentroDeVao(ponto.minuto)) continue;

    if (minutoAnterior !== null && cruzaVao(minutoAnterior, ponto.minuto)) {
      if (atual.length > 0) segmentos.push(atual);
      atual = [];
    }
    atual.push({ px: x(ponto.minuto), py: y(ponto.atencao_pct) });
    minutoAnterior = ponto.minuto;
  }
  if (atual.length > 0) segmentos.push(atual);

  // Caminho da linha e da area preenchida, por segmento. Um segmento de um unico
  // ponto nao desenha linha, entao ganha um "L" pra si mesmo e vira um pontinho.
  const caminhos = segmentos.map((coordenadas) => {
    const passos = coordenadas
      .map((c, i) => `${i === 0 ? "M" : "L"} ${c.px.toFixed(1)} ${c.py.toFixed(1)}`)
      .join(" ");
    const linha =
      coordenadas.length === 1
        ? `${passos} L ${coordenadas[0].px.toFixed(1)} ${coordenadas[0].py.toFixed(1)}`
        : passos;
    const area =
      `M ${coordenadas[0].px.toFixed(1)} ${(H - B).toFixed(1)} ` +
      coordenadas.map((c) => `L ${c.px.toFixed(1)} ${c.py.toFixed(1)}`).join(" ") +
      ` L ${coordenadas[coordenadas.length - 1].px.toFixed(1)} ${(H - B).toFixed(1)} Z`;
    // Chave estavel: cada trecho comeca num x proprio, entao o primeiro ponto
    // identifica o segmento mesmo se a segmentacao mudar.
    return { linha, area, chave: coordenadas[0].px };
  });

  const linhasGrade = [0, 25, 50, 75, 100];

  // Rotulos do eixo X sem aglomerar: no maximo ~6, espacados por igual.
  const passo = Math.max(1, Math.ceil(dados.length / 6));
  const marcasX = dados.filter((_, i) => i % passo === 0 || i === dados.length - 1);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-56 w-full"
      role="img"
      aria-label={
        `Gráfico da atenção da turma ao longo de ${pontos.length} minutos de aula.` +
        (faixas.length > 0
          ? ` A atenção não foi medida em ${faixas.length === 1 ? "um trecho" : `${faixas.length} trechos`}: ` +
            faixas
              .map((f) => `${f.rotulo}, das ${f.horario_inicio} às ${f.horario_fim}`)
              .join("; ") +
            "."
          : "")
      }
      preserveAspectRatio="none"
    >
      {/* Faixas dos trechos sem medicao, ATRAS da grade e da curva: sao fundo,
          nao dado. O rotulo so' aparece quando a faixa e' larga o bastante pra
          ele caber sem estourar as bordas. */}
      {faixas.map((faixa) => {
        const aparencia = aparenciaDaCorMateria(faixa.cor as CorMateria);
        const cabeRotulo = faixa.largura >= 46;
        return (
          <g key={`${faixa.modo}-${faixa.minuto_inicio}`}>
            <rect
              x={faixa.px}
              y={T}
              width={faixa.largura}
              height={alturaUtil}
              fill={aparencia?.fundo ?? "var(--border)"}
            />
            {cabeRotulo && (
              <text
                x={faixa.px + faixa.largura / 2}
                y={T + 14}
                textAnchor="middle"
                fontSize={10}
                fontWeight={600}
                fill={aparencia?.texto ?? "var(--text-muted)"}
              >
                {faixa.rotulo}
              </text>
            )}
          </g>
        );
      })}

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

      {/* Um par area+linha por trecho continuo. Varios paths em vez de um so'
          e' justamente o que deixa o vao vazio. */}
      {caminhos.map((caminho) => (
        <g key={caminho.chave}>
          <path d={caminho.area} fill="url(#preenchimento-atencao)" />
          <path
            d={caminho.linha}
            fill="none"
            stroke="var(--primary)"
            strokeWidth={2.5}
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </g>
      ))}
    </svg>
  );
}
