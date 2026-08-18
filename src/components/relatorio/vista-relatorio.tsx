import { BlocoChamada } from "@/components/relatorio/bloco-chamada";
import { BlocoColapsavel } from "@/components/relatorio/bloco-colapsavel";
import { BotaoCopiarDiario } from "@/components/relatorio/botao-copiar-diario";
import { ConfiancaDaLeitura } from "@/components/relatorio/confianca-da-leitura";
import { ConteudoDaAula } from "@/components/relatorio/conteudo-da-aula";
import { FeedInsights } from "@/components/relatorio/feed-insights";
import { GraficoLinhaTempo } from "@/components/relatorio/grafico-linha-tempo";
import {
  NumeroDaAula,
  type FaixaNumero,
} from "@/components/relatorio/numero-da-aula";
import { SecaoLousas } from "@/components/relatorio/secao-lousas";
import { SecaoTranscricao } from "@/components/relatorio/secao-transcricao";
import { SugestaoDaCupcam } from "@/components/relatorio/sugestao-da-cupcam";
import {
  IconQueda,
  IconRaio,
  IconRelogio,
  IconTendencia,
} from "@/components/ui/icons";
import {
  dataDoTimestamp,
  formatarDataExtensa,
  formatarIntervalo,
  formatarPct,
} from "@/lib/format";
import type { ChamadaDaSessao, RelatorioDaSessao } from "@/lib/types";

type VistaRelatorioProps = {
  relatorio: RelatorioDaSessao;
  /** Lista de alunos da chamada. Null quando a rota falhou. */
  chamada: ChamadaDaSessao | null;
};

/** Texto e cor da variacao vs media historica (positivo/negativo/neutro). */
function descreverVariacao(variacao: number | null) {
  if (variacao === null) return null;

  // Ternario simples de sinal: +5, -5 ou 0. A cor segue a direcao.
  const sinal = variacao > 0 ? "+" : "";
  const cor =
    variacao > 0
      ? "var(--ok-fg)"
      : variacao < 0
        ? "var(--danger-fg)"
        : "var(--text-muted)";

  return { texto: `${sinal}${variacao}% vs média histórica`, cor };
}

/**
 * A faixa de significado do engajamento — COMPARADA COM A MEDIA DA PROPRIA
 * TURMA, nunca com uma escala absoluta.
 *
 * O motivo esta em `FaixaNumero`: 11% e' engajamento normal aqui, porque o
 * percentual conta so' quem a camera classificou como ATENTO. Numa escala
 * absoluta esse numero sairia vermelho e acusaria o professor de algo que o
 * dado nao sustenta.
 *
 * Os cortes sao em PONTOS PERCENTUAIS, nunca em razao: com media de 21%, cair
 * pra 11% e' -10 pp; se a media fosse 80%, a mesma razao seria -38 pp, coisa
 * completamente diferente. Ate 5 pp e' oscilacao normal, ate 15 pede um olhar,
 * acima disso esta fora do padrao da turma.
 */
function faixaDaVariacao(variacao: number | null): FaixaNumero {
  if (variacao === null) return "neutro";
  if (variacao >= -5) return "bom";
  return variacao >= -15 ? "atencao" : "ruim";
}

/**
 * A tela de UMA aula.
 *
 * Componente de servidor: so' recebe o dado ja pronto e o distribui. Nenhuma
 * logica de rede aqui.
 *
 * A ORDEM E O ARRANJO SAO OS DO PROTOTIPO: quatro numeros na fileira, depois
 * a malha de 12 colunas com o grafico dominante (8) e a chamada ao lado (4), e
 * dai pra baixo tudo em largura cheia — conteudo, lousa, sugestao e a
 * transcricao por ultimo.
 */
export function VistaRelatorio({ relatorio, chamada }: VistaRelatorioProps) {
  const engajamento = formatarPct(relatorio.engajamento_medio_pct);
  const variacao = descreverVariacao(relatorio.variacao_vs_historico_pct);
  const faixaDoEngajamento = faixaDaVariacao(
    relatorio.variacao_vs_historico_pct,
  );
  const data = formatarDataExtensa(dataDoTimestamp(relatorio.sessao.iniciada_em));

  // Turma e horario vem da aula da grade e sao nulos quando a sessao nao tem
  // aula associada (camera ligada na mao, ou aula excluida depois). A linha
  // encolhe pra so' o que existe — sem placeholder no lugar.
  const identificacao = [
    relatorio.sessao.turma,
    formatarIntervalo(relatorio.sessao.hora_inicio, relatorio.sessao.hora_fim),
  ]
    .filter(Boolean)
    .join(" · ");

  const minutosMedidos = relatorio.linha_do_tempo.length;

  return (
    <div className="flex flex-col gap-[15px]">
      {/* Cabecalho: o nome da aula em h2 (o h1 da tela mora no AppShell), com
          materia, data e horario numa linha de metadados abaixo. */}
      <div className="mb-[3px] ml-[17px] flex flex-wrap items-start gap-[14px]">
        <div className="flex min-w-0 flex-col items-start gap-[6px]">
          <h2
            className="text-text text-[21px] leading-[1.25] font-semibold"
            style={{ letterSpacing: "-0.02em" }}
          >
            {relatorio.sessao.materia ?? "Aula sem matéria"}
          </h2>
          <div className="text-text-muted flex flex-wrap items-center gap-2 text-[13px]">
            <span>{data}</span>
            {identificacao && (
              <>
                <span className="opacity-45">·</span>
                <span>{identificacao}</span>
              </>
            )}
          </div>
        </div>

        {relatorio.sessao.em_andamento && (
          <span
            className="rounded-full px-3 py-1.5 text-xs font-semibold"
            style={{ background: "var(--primary-soft)", color: "var(--text-brand)" }}
          >
            Aula ao vivo
          </span>
        )}

        {/* `.aula-acoes` do protótipo: o "Copiar diário" mora AQUI, no topo,
            e não numa seção própria no meio da tela. */}
        <BotaoCopiarDiario sessaoId={relatorio.sessao.id} />
      </div>

      {/* QUATRO numeros, nao cinco: a PRESENCA saiu daqui e virou o card de
          Chamada ao lado do grafico, com a lista de alunos. Repetir o numero
          nos dois lugares gastaria uma das 4 vagas da fileira. */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(178px,1fr))] items-stretch gap-[11px]">
        <NumeroDaAula
          rotulo="Engajamento médio"
          valor={engajamento ?? "—"}
          apoio="Conta só quem a câmera classificou como atento, no tempo em que havia alguém em cena."
          tag={
            variacao && relatorio.variacao_vs_historico_pct !== null
              ? {
                  texto: `${Math.abs(relatorio.variacao_vs_historico_pct)} pp ${
                    relatorio.variacao_vs_historico_pct < 0 ? "abaixo" : "acima"
                  } da média`,
                  desce: relatorio.variacao_vs_historico_pct < 0,
                }
              : undefined
          }
          faixa={faixaDoEngajamento}
          icone={<IconTendencia size={16} />}
        />
        <NumeroDaAula
          rotulo="Melhor momento"
          valor={relatorio.pico_atencao?.horario ?? "—"}
          apoio={
            relatorio.pico_atencao
              ? `${relatorio.pico_atencao.atencao_pct}% da turma atenta`
              : "sem leitura"
          }
          faixa={relatorio.pico_atencao ? "bom" : "neutro"}
          icone={<IconRaio size={16} />}
        />
        {/* AMBAR, nunca vermelho: este card mostra o PIOR minuto da aula, e
            toda aula tem um pior minuto — inclusive a excelente. Vermelho por
            definicao viraria um veredito que o dado nao deu. */}
        <NumeroDaAula
          rotulo="Momento mais disperso"
          valor={relatorio.queda_atencao?.horario ?? "—"}
          apoio={
            relatorio.queda_atencao
              ? `${relatorio.queda_atencao.atencao_pct}% da turma atenta`
              : "sem leitura"
          }
          faixa={relatorio.queda_atencao ? "atencao" : "neutro"}
          icone={<IconQueda size={16} />}
        />
        {/* NEUTRO mesmo com 0 min: numa aula de 3 minutos medidos, nenhum
            minuto passar do limiar e' a amostra sendo curta, nao a turma
            tendo falhado. */}
        <NumeroDaAula
          rotulo="Tempo de foco"
          valor={
            relatorio.tempo_foco_minutos === null ? (
              "—"
            ) : (
              <>
                {relatorio.tempo_foco_minutos}
                <span className="text-text-muted text-[19px]"> min</span>
              </>
            )
          }
          apoio={
            relatorio.tempo_foco_minutos === null
              ? "sem leitura"
              : `Acima do limiar, em ${minutosMedidos} ${
                  minutosMedidos === 1 ? "minuto medido" : "minutos medidos"
                }`
          }
          icone={<IconRelogio size={16} />}
        />
      </div>

      {/* Logo ABAIXO dos numeros, nao dentro deles: o card de engajamento ja
          gasta o rodape com a tag de variacao (regra "tag XOR apoio" do
          `NumeroDaAula`), e a ressalva vale pra fileira toda. Some sozinha
          quando a leitura foi boa. */}
      <ConfiancaDaLeitura leitura={relatorio.leitura} />

      {/* A GRADE DE 12 COLUNAS.
          12 divide por 2, 3, 4 e 6 — os arranjos 8+4, 6+6 e 4+4+4 saem todos
          da mesma malha, sem numero quebrado. Cada bloco diz quanto ocupa em
          `--col` (ver `BlocoColapsavel`), e o padrao e' a linha inteira.

          `row-gap` maior que `column-gap`: empilhado, 11px cola; lado a lado
          ja' separa.

          `items-stretch`: o artifact iguala a altura do par
          Atenção/Chamada (ele apontou em 15/08 — o grafico ficava mais baixo
          que a chamada ao lado). Os blocos de largura CHEIA abaixo (Conteúdo,
          Lousa, Sugestão, Transcrição) nao tem vizinho na mesma linha, entao
          esticar nao muda nada neles. */}
      <div className="grid grid-cols-1 items-stretch gap-x-[11px] gap-y-[20px] min-[720px]:grid-cols-6 min-[1180px]:grid-cols-12 [&>*]:col-span-full min-[720px]:[&>*]:[grid-column:span_calc(var(--col)/2)] min-[1180px]:[&>*]:[grid-column:span_var(--col)]">
        <BlocoColapsavel
          titulo="Atenção ao longo da aula"
          colunas={8}
          conta={`${minutosMedidos} ${
            minutosMedidos === 1 ? "min medido" : "min medidos"
          }`}
        >
          <GraficoLinhaTempo
            pontos={relatorio.linha_do_tempo}
            periodos={relatorio.periodos_sem_medicao}
          />
        </BlocoColapsavel>

        <BlocoColapsavel
          titulo="Chamada automática"
          colunas={4}
          conta={`${relatorio.presenca.presentes} de ${relatorio.presenca.total}`}
        >
          {chamada ? (
            <BlocoChamada chamada={chamada} sessaoId={relatorio.sessao.id} />
          ) : (
            <p className="text-text-muted text-[12.5px]">
              Não foi possível carregar a lista de alunos desta aula.
            </p>
          )}
        </BlocoColapsavel>

        {/* Largura cheia daqui pra baixo, na ordem do protótipo: conteúdo,
            lousa, sugestão e a transcrição por último. */}
        <BlocoColapsavel titulo="Conteúdo da aula">
          <ConteudoDaAula sessaoId={relatorio.sessao.id} />
        </BlocoColapsavel>

        <BlocoColapsavel titulo="Lousa">
          <SecaoLousas sessaoId={relatorio.sessao.id} />
        </BlocoColapsavel>

        <BlocoColapsavel titulo="Sugestão da Cupcam" destaque>
          <SugestaoDaCupcam
            recomendacoes={relatorio.recomendacoes}
            sessaoId={relatorio.sessao.id}
          />
        </BlocoColapsavel>

        {/* Nasce FECHADA: e' a secao mais longa e a menos confiavel
            (reconhecimento de fala erra), e o professor abre o relatorio pra
            ver o que ensinou primeiro. */}
        <BlocoColapsavel titulo="Transcrição" abertoInicial={false}>
          <SecaoTranscricao sessaoId={relatorio.sessao.id} />
        </BlocoColapsavel>
      </div>

      {/* Fora da grade: o feed e' uma coluna de avisos curtos, nao um bloco
          que o professor reordena. */}
      <FeedInsights itens={relatorio.feed_insights} />
    </div>
  );
}
