import { notFound } from "next/navigation";

import { AgendaSemana } from "@/components/aulas/agenda-semana";
import { EngajamentoDaTurma } from "@/components/aulas/engajamento-da-turma";
import { ListaAulas } from "@/components/aulas/lista-aulas";
import { NumerosDaTurma } from "@/components/aulas/numeros-da-turma";
import { OndeParei } from "@/components/aulas/onde-parei";
import { SeletorTurma } from "@/components/aulas/seletor-turma";
import { AppShell } from "@/components/layout/app-shell";
import {
  ApiError,
  buscarAulasDaTurma,
  buscarContinuidadeDaTurma,
  buscarEstatisticasDaTurma,
  buscarSemanaDaTurma,
  listarTurmas,
} from "@/lib/api";
import { consolidarTurma } from "@/lib/consolidar";

type Props = {
  // No App Router os parametros de rota chegam como Promise.
  params: Promise<{ turmaId: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { turmaId } = await params;
  const id = Number(turmaId);
  if (!Number.isInteger(id) || id <= 0) return { title: "Minhas aulas" };

  const aulas = await buscarAulasDaTurma(id).catch(() => null);
  if (!aulas) return { title: "Minhas aulas" };

  return { title: `Aulas · ${aulas.turma.nome} — Cupcam Insights` };
}

export default async function AulasDaTurmaPage({ params }: Props) {
  const { turmaId } = await params;
  const id = Number(turmaId);

  // Endereco com id nao numerico (/aulas/abc) e' 404, nao erro de servidor.
  if (!Number.isInteger(id) || id <= 0) notFound();

  // As chamadas sao independentes: em paralelo, nao em sequencia.
  const [turmas, aulas, continuidade, semana, estatisticas] = await Promise.all([
    listarTurmas(),
    buscarAulasDaTurma(id).catch((causa) => {
      if (causa instanceof ApiError && causa.isNotFound) notFound();
      throw causa;
    }),
    // Engole a falha em vez de propagar: esta e' a unica chamada da pagina que
    // depende do Gemini, e a lista de aulas — o conteudo principal da tela —
    // nao pode sumir porque o assistente esta fora do ar. O card simplesmente
    // nao aparece.
    buscarContinuidadeDaTurma(id).catch(() => null),
    // Mesma logica: a grade e' contexto, nao o conteudo principal da tela.
    buscarSemanaDaTurma(id).catch(() => null),
    // E os numeros tambem: sem eles a tela perde a fileira do topo, mas a
    // lista de aulas continua de pe.
    buscarEstatisticasDaTurma(id).catch(() => null),
  ]);

  // Reusa o mesmo consolidador da tela Relatorios: a media de engajamento e a
  // serie do grafico saem das aulas que TEM leitura, e a regra de quais contam
  // precisa ser uma so' nas duas telas.
  const resumo = estatisticas
    ? consolidarTurma(aulas.aulas, estatisticas)
    : null;

  // Turma sem NENHUMA aula na grade nao desenha o bloco: cinco colunas dizendo
  // "Sem aula" ocupam meia tela pra nao informar nada. A API sempre devolve os
  // 7 dias, entao `semana.length > 0` nao serve como teste aqui.
  const temGrade = semana?.some((dia) => dia.aulas.length > 0) ?? false;

  return (
    <AppShell
      titulo="Minhas aulas"
      controles={<SeletorTurma turmas={turmas} turmaAtualId={id} comOpcaoTodas />}
    >
      {/* gap 13px, a coluna do `.miolo` do prototipo. O h1 que ficava aqui
          saiu: o AppShell ja' desenha o titulo no cabecalho, e o segundo
          "Minhas aulas" logo abaixo era duplicata.

          A ORDEM e' a que ele especificou em 14/08, de cima pra baixo:
          agenda da semana, os 4 numeros, "voce parou aqui", o grafico de
          engajamento e a lista das ultimas aulas. */}
      <div className="flex flex-col gap-[13px]">
        <p
          className="text-text-body ml-[17px] max-w-[62ch] text-sm leading-[1.5]"
          style={{ fontWeight: 300 }}
        >
          Como está a {aulas.turma.nome} e o que já foi dado nela.
        </p>

        {/* O seletor tambem aparece aqui no celular, onde o cabecalho e' enxuto. */}
        <div className="lg:hidden">
          <SeletorTurma turmas={turmas} turmaAtualId={id} comOpcaoTodas />
        </div>

        {temGrade && semana && (
          <AgendaSemana semana={semana} nomeDaTurma={aulas.turma.nome} />
        )}

        {estatisticas && (
          <NumerosDaTurma
            estatisticas={estatisticas}
            engajamentoMedio={resumo?.engajamentoMedio ?? null}
            aulasComDados={resumo?.aulasComDados ?? 0}
            serieEngajamento={resumo?.serie.map((p) => p.engajamento) ?? []}
          />
        )}

        {continuidade !== null && (
          <OndeParei
            continuidade={continuidade}
            turmaId={id}
            // A materia vive na lista de aulas, nao no historico: cruza pelo
            // `sessao_id` em vez de pedir o campo numa chamada nova.
            materia={
              aulas.aulas.find(
                (a) => a.sessao_id === continuidade.ultima_aula?.sessao_id,
              )?.materia ?? null
            }
          />
        )}

        {resumo && <EngajamentoDaTurma serie={resumo.serie} turmaId={id} />}

        <ListaAulas
          aulas={aulas.aulas}
          turmaId={id}
          nomeTurma={aulas.turma.nome}
        />
      </div>
    </AppShell>
  );
}
