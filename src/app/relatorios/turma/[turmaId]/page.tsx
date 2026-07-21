import { notFound } from "next/navigation";

import { SeletorDataRelatorio } from "@/components/relatorio/seletor-data-relatorio";
import { SeletorTurmaRelatorio } from "@/components/relatorio/seletor-turma-relatorio";
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

  // Controles do cabecalho: turma e data (a data leva para Minhas Aulas).
  const controles = (
    <>
      <SeletorTurmaRelatorio turmas={turmas} turmaAtualId={id} />
      <SeletorDataRelatorio turmaId={id} />
    </>
  );

  return (
    <AppShell titulo="Relatórios" controles={controles}>
      {/* No celular os controles aparecem no corpo, onde ha espaco. */}
      <div className="mb-6 flex flex-wrap gap-2 lg:hidden">{controles}</div>

      <VistaRelatorioGeral resumo={resumo} nomeTurma={aulas.turma.nome} />
    </AppShell>
  );
}
