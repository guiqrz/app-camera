import { CardRecomendacao } from "@/components/relatorio/card-recomendacao";
import { FeedInsights } from "@/components/relatorio/feed-insights";
import { GraficoLinhaTempo } from "@/components/relatorio/grafico-linha-tempo";
import { PainelPresenca } from "@/components/relatorio/painel-presenca";
import {
  IconCheck,
  IconQueda,
  IconRaio,
  IconRelogio,
  IconTendencia,
} from "@/components/ui/icons";
import { StatCard } from "@/components/ui/stat-card";
import { dataDoTimestamp, formatarDataExtensa, formatarPct } from "@/lib/format";
import type { RelatorioDaSessao } from "@/lib/types";

type VistaRelatorioProps = {
  relatorio: RelatorioDaSessao;
};

/** Texto e cor da variacao vs media historica (positivo/negativo/neutro). */
function descreverVariacao(variacao: number | null) {
  if (variacao === null) return null;

  // Ternario simples de sinal: +5, -5 ou 0. A cor segue a direcao.
  const sinal = variacao > 0 ? "+" : "";
  const cor =
    variacao > 0 ? "var(--ok-fg)" : variacao < 0 ? "var(--danger-fg)" : "var(--text-muted)";

  return { texto: `${sinal}${variacao}% vs média histórica`, cor };
}

/**
 * Monta a tela "Relatorio" a partir da rota gorda /sessoes/{id}/relatorio.
 *
 * Componente de servidor: so' recebe o dado ja pronto e o distribui pelos
 * cartoes e paineis. Nenhuma logica de rede aqui.
 */
export function VistaRelatorio({ relatorio }: VistaRelatorioProps) {
  const engajamento = formatarPct(relatorio.engajamento_medio_pct);
  const variacao = descreverVariacao(relatorio.variacao_vs_historico_pct);
  const data = formatarDataExtensa(dataDoTimestamp(relatorio.sessao.iniciada_em));

  return (
    <div className="flex flex-col gap-7">
      {/* Cabecalho da tela */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1
            className="text-text text-2xl font-extrabold sm:text-3xl"
            style={{ fontFamily: "var(--font-geologica)" }}
          >
            Visão geral da turma
          </h1>
          <p className="text-text-body mt-1.5 text-sm">
            Resumo da atenção e do engajamento coletivo em {data}.
          </p>
        </div>

        {relatorio.sessao.em_andamento && (
          <span
            className="rounded-full px-3 py-1.5 text-xs font-extrabold"
            style={{ background: "var(--violet-100)", color: "var(--text-brand)" }}
          >
            Aula ao vivo
          </span>
        )}
      </div>

      {/* Cinco cartoes numa linha so', como no Figma. Em telas onde os cinco
          nao cabem sem espremer, a fileira rola horizontalmente (cada card
          tem largura minima); no celular estreito eles empilham. O
          [&>*]:min-w garante que os cards nao encolham demais na rolagem. */}
      <div className="grid grid-cols-1 gap-4 min-[560px]:auto-cols-fr min-[560px]:grid-flow-col min-[560px]:overflow-x-auto min-[560px]:[&>*]:min-w-[190px] xl:min-w-0 xl:[&>*]:min-w-0">
        <StatCard
          rotulo="Engajamento médio"
          valor={engajamento ?? "Sem dados"}
          apoio={variacao && <span style={{ color: variacao.cor }}>{variacao.texto}</span>}
          icone={
            <span style={{ color: "var(--primary)" }}>
              <IconTendencia />
            </span>
          }
        />
        <StatCard
          rotulo="Pico de atenção"
          valor={relatorio.pico_atencao?.horario ?? "—"}
          apoio={
            relatorio.pico_atencao
              ? `${relatorio.pico_atencao.atencao_pct}% da turma atenta`
              : "Sem leitura"
          }
          icone={
            <span style={{ color: "var(--ok-fg)" }}>
              <IconRaio />
            </span>
          }
        />
        <StatCard
          rotulo="Queda de atenção"
          valor={relatorio.queda_atencao?.horario ?? "—"}
          apoio={
            relatorio.queda_atencao
              ? `${relatorio.queda_atencao.atencao_pct}% da turma atenta`
              : "Sem leitura"
          }
          icone={
            <span style={{ color: "var(--danger-fg)" }}>
              <IconQueda />
            </span>
          }
        />
        <StatCard
          rotulo="Tempo de foco"
          valor={
            relatorio.tempo_foco_minutos === null ? (
              "—"
            ) : (
              <>
                {relatorio.tempo_foco_minutos}
                <span className="text-text-muted text-lg font-bold"> min</span>
              </>
            )
          }
          apoio="Minutos acima do limiar de foco"
          icone={
            <span style={{ color: "var(--primary)" }}>
              <IconRelogio />
            </span>
          }
        />
        <StatCard
          variante="brand"
          rotulo="Presença automática"
          valor={
            <>
              {relatorio.presenca.detectados}
              <span className="text-lg font-bold opacity-80">
                {" "}
                / {relatorio.presenca.total}
              </span>
            </>
          }
          apoio="Alunos detectados em sala"
          icone={<IconCheck />}
        />
      </div>

      {/* Grafico + coluna lateral */}
      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="border-border-default bg-surface shadow-card flex flex-col rounded-2xl border p-5 sm:p-6">
          <div className="mb-1">
            <h2 className="text-text text-lg font-extrabold">
              Linha do tempo de engajamento
            </h2>
            <p className="text-text-muted text-sm">
              Evolução do foco da turma ao longo da aula.
            </p>
          </div>
          <div className="mt-4">
            <GraficoLinhaTempo pontos={relatorio.linha_do_tempo} />
          </div>
        </div>

        <div className="flex flex-col gap-5">
          <PainelPresenca presenca={relatorio.presenca} />
          <FeedInsights itens={relatorio.feed_insights} />
        </div>
      </div>

      {/* Recomendacao da I.A, largura cheia */}
      <CardRecomendacao recomendacoes={relatorio.recomendacoes} />
    </div>
  );
}
