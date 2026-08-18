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
  // 200, nao 240: bate a proporcao do artifact (viewBox 600x200). O SVG
  // escala pro tamanho REAL do container (ver `h-full` abaixo); com viewBox
  // mais raso, cada unidade vira mais pixel na tela — fonte e ponto de 10-11
  // "unidades" saem visualmente maiores sem precisar mexer no font-size.
  const H = 200;
  const larguraUtil = W - L - R;
  const alturaUtil = H - T - B;

  // Os pontos como vieram. Um ponto sozinho NAO e' duplicado aqui: repetir a
  // mesma leitura punha dois filhos com a mesma key (o minuto no eixo X, o x
  // inicial no segmento) e o React reclamava em toda aula de leitura unica. O
  // caso de um ponto ja' e' tratado onde importa, no desenho do caminho.
  const dados = pontos;

  /* ⚠️ O TOPO DO EIXO ACOMPANHA O DADO — não é 100% fixo.
     Era isto o "bugado" que ele apontou em 14/08: numa aula cujo máximo é
     25%, o eixo indo até 100% espremia a curva inteira no quinto de baixo e
     ela parecia uma linha reta rente ao chão. A variação de 1% para 25% —
     que é a informação da tela — sumia.

     O teto vira o próximo múltiplo de 10 acima do pico, com piso em 10: o
     eixo continua legível ("0/10/20/30%") em vez de terminar num número
     quebrado, e uma aula de 90% ainda escala até 100 normalmente.

     A escala é DECLARADA nos rótulos do eixo, então ninguém lê 25% como se
     fosse o teto absoluto. */
  const picoMedido = Math.max(...dados.map((p) => p.atencao_pct), 0);
  const topoDoEixo = Math.max(10, Math.ceil(picoMedido / 10) * 10);

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
  const y = (pct: number) => T + (1 - pct / topoDoEixo) * alturaUtil;

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
    return { linha, area, chave: coordenadas[0].px, pontos: coordenadas };
  });

  // 4 linhas espaçadas no eixo real (0 / 1/3 / 2/3 / topo), como o protótipo
  // ("0 / 10 / 20 / 30%"). Fixar 0/25/50/75/100 desenharia grade fora da
  // escala assim que o topo deixasse de ser 100.
  const linhasGrade = [0, 1, 2, 3].map((i) =>
    Math.round((topoDoEixo / 3) * i),
  );

  // Rotulos do eixo X sem aglomerar: no maximo ~6, espacados por igual.
  const passo = Math.max(1, Math.ceil(dados.length / 6));
  const marcasX = dados.filter((_, i) => i % passo === 0 || i === dados.length - 1);

  return (
    <div className="flex h-full min-h-72 flex-col">
      <svg
      viewBox={`0 0 ${W} ${H}`}
      // Antes `h-72` FIXO (288px). Ele apontou em 15/08 que o card ficava
      // mais baixo que a Chamada ao lado, com fonte/ícone "compactos" — o
      // bloco pai agora estica (`items-stretch` na grade + `flex-1` no
      // `BlocoColapsavel`), entao o SVG tambem precisa crescer com ele em
      // vez de travar num numero fixo. `min-h-72` so' evita que aulas com
      // pouco conteudo ao lado (a Chamada com poucos alunos) espremam o
      // grafico abaixo do tamanho legivel.
      className="w-full flex-1"
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
            {/* Borda TRACEJADA, como no protótipo: ela diz "aqui não há
                medição" em vez de parecer mais um bloco de dado pintado. */}
            <rect
              x={faixa.px}
              y={T}
              width={faixa.largura}
              height={alturaUtil}
              rx={7}
              fill={aparencia?.fundo ?? "var(--surface-2)"}
              stroke="var(--text-muted)"
              strokeOpacity={0.45}
              strokeDasharray="4 3"
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

      {/* Área FORTE (0.42), não os 0.28 de antes: com o valor baixo ela sumia
          e a curva ficava boiando sem base. A parada intermediária em 70%
          evita que o meio do preenchimento apague cedo demais. */}
      <defs>
        <linearGradient id="preenchimento-atencao" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--graf-linha)" stopOpacity="0.42" />
          <stop offset="70%" stopColor="var(--graf-linha)" stopOpacity="0.1" />
          <stop offset="100%" stopColor="var(--graf-linha)" stopOpacity="0" />
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
            stroke="var(--graf-linha)"
            strokeWidth={3}
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
          {/* Pontos nos minutos medidos, como na referência: eles mostram
              ONDE houve leitura, o que a linha sozinha não diz. */}
          {caminho.pontos.map((p) => (
            <circle
              key={p.px}
              cx={p.px}
              cy={p.py}
              r={4.5}
              fill="var(--graf-linha)"
            />
          ))}
        </g>
      ))}
      </svg>

      {/* Legenda: o que a linha significa e o que a faixa significa. Sem ela a
          faixa tracejada vira "buraco no gráfico" em vez de "não foi medido". */}
      <p className="text-text-muted mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11.5px]">
        <span className="inline-flex items-center gap-[6px]">
          <span
            className="inline-block h-[3px] w-[14px] rounded-full"
            style={{ background: "var(--graf-linha)" }}
            aria-hidden
          />
          % da turma atenta
        </span>
        {faixas.length > 0 && (
          <span className="inline-flex items-center gap-[6px]">
            <span
              className="inline-block h-[10px] w-[14px] rounded-[3px] border border-dashed"
              style={{ borderColor: "var(--text-muted)", opacity: 0.6 }}
              aria-hidden
            />
            atenção não medida
          </span>
        )}
      </p>
    </div>
  );
}
