import { notFound } from "next/navigation";

import { ListaAulas } from "@/components/aulas/lista-aulas";
import { OndeParei } from "@/components/aulas/onde-parei";
import { SeletorTurma } from "@/components/aulas/seletor-turma";
import { AppShell } from "@/components/layout/app-shell";
import {
  ApiError,
  buscarAulasDaTurma,
  buscarContinuidadeDaTurma,
  listarTurmas,
} from "@/lib/api";

type Props = {
  // No App Router os parametros de rota e de busca chegam como Promise.
  params: Promise<{ turmaId: string }>;
  searchParams: Promise<{ data?: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { turmaId } = await params;
  const id = Number(turmaId);
  if (!Number.isInteger(id) || id <= 0) return { title: "Minhas aulas" };

  const aulas = await buscarAulasDaTurma(id).catch(() => null);
  if (!aulas) return { title: "Minhas aulas" };

  return { title: `Aulas · ${aulas.turma.nome} — Cupcam Insights` };
}

export default async function AulasDaTurmaPage({ params, searchParams }: Props) {
  const { turmaId } = await params;
  const { data: dataInicial } = await searchParams;
  const id = Number(turmaId);

  // Endereco com id nao numerico (/aulas/abc) e' 404, nao erro de servidor.
  if (!Number.isInteger(id) || id <= 0) notFound();

  // As tres chamadas sao independentes: em paralelo, nao em sequencia.
  const [turmas, aulas, continuidade] = await Promise.all([
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
  ]);

  return (
    <AppShell
      titulo="Minhas aulas"
      controles={<SeletorTurma turmas={turmas} turmaAtualId={id} />}
    >
      <div className="flex flex-col gap-7">
        <div>
          <h1
            className="text-text text-2xl font-extrabold sm:text-3xl"
            style={{ fontFamily: "var(--font-geologica)" }}
          >
            Minhas aulas
          </h1>
          <p className="text-text-body mt-1.5 text-sm">
            Escolha uma turma para visualizar os insights da Cupcam.
          </p>
        </div>

        {/* O seletor tambem aparece aqui no celular, onde o cabecalho e' enxuto. */}
        <div className="lg:hidden">
          <SeletorTurma turmas={turmas} turmaAtualId={id} />
        </div>

        {/* Antes da lista: "onde parei" e' o que o professor quer saber ao
            abrir a turma; a lista de aulas e' pra quando ele procura uma aula
            especifica. */}
        {continuidade !== null && <OndeParei continuidade={continuidade} />}

        <ListaAulas
          aulas={aulas.aulas}
          turmaId={id}
          nomeTurma={aulas.turma.nome}
          dataInicial={dataInicial}
        />
      </div>
    </AppShell>
  );
}
