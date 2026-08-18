import { notFound } from "next/navigation";

import { SeletorTurma } from "@/components/aulas/seletor-turma";
import { VistaRelatorioGeral } from "@/components/relatorio/vista-relatorio-geral";
import { AppShell } from "@/components/layout/app-shell";
import {
  ApiError,
  buscarAulasDaTurma,
  buscarEstatisticasDaTurma,
  listarTurmas,
} from "@/lib/api";
import { consolidarTurma } from "@/lib/consolidar";

type Props = {
  params: Promise<{ turmaId: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { turmaId } = await params;
  const id = Number(turmaId);
  if (!Number.isInteger(id) || id <= 0) return { title: "Relatórios" };

  const aulas = await buscarAulasDaTurma(id).catch(() => null);
  if (!aulas) return { title: "Relatórios" };

  return { title: `Relatório · ${aulas.turma.nome} — Cupcam Insights` };
}

export default async function RelatorioGeralPage({ params }: Props) {
  const { turmaId } = await params;
  const id = Number(turmaId);

  if (!Number.isInteger(id) || id <= 0) notFound();

  const tratar404 = (causa: unknown) => {
    if (causa instanceof ApiError && causa.isNotFound) notFound();
    throw causa;
  };

  // Tres chamadas independentes, em paralelo.
  const [turmas, aulas, estatisticas] = await Promise.all([
    listarTurmas(),
    buscarAulasDaTurma(id).catch(tratar404),
    buscarEstatisticasDaTurma(id).catch(tratar404),
  ]);

  const resumo = consolidarTurma(aulas.aulas, estatisticas);

  // SO' o seletor de turma, como no prototipo. O seletor de DATA saiu em
  // 14/08 junto com a busca da lista de aulas: ele levava pra `/aulas?data=`,
  // um filtro que deixou de existir, e a propria tela de Relatorios ja tem
  // busca e filtro de mes logo abaixo.
  //
  // MESMO componente `SeletorTurma` de Minhas Aulas, e nao mais o
  // `SeletorTurmaRelatorio` proprio: os dois eram visualmente diferentes
  // (fundo, padding, raio) apesar de ser o MESMO `.escopo` no protototipo —
  // ele apontou a divergencia em 14/08. `baseRota` custom e sem
  // `comOpcaoTodas`: Relatorios lista aulas de UMA turma, sem visao geral.
  const controles = (
    <SeletorTurma
      turmas={turmas}
      turmaAtualId={id}
      baseRota="/relatorios/turma"
    />
  );

  return (
    <AppShell titulo="Relatórios" controles={controles}>
      {/* No celular os controles aparecem no corpo, onde ha espaco. */}
      <div className="mb-4 flex flex-wrap gap-2 lg:hidden">{controles}</div>

      <VistaRelatorioGeral
        resumo={resumo}
        nomeTurma={aulas.turma.nome}
        turmaId={id}
        aulas={aulas.aulas}
      />
    </AppShell>
  );
}
