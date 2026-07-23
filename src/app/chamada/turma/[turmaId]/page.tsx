import { notFound } from "next/navigation";

import { SeletorTurma } from "@/components/aulas/seletor-turma";
import { ListaAulasChamada } from "@/components/chamada/lista-aulas-chamada";
import { AppShell } from "@/components/layout/app-shell";
import { ApiError, buscarAulasDaTurma, listarTurmas } from "@/lib/api";

type Props = {
  params: Promise<{ turmaId: string }>;
};

/**
 * Escolha da aula para fazer chamada.
 *
 * A chamada e' sempre de UMA sessao. A aula em andamento (ou a mais recente)
 * vai em destaque no topo; as anteriores ficam num cartao recolhivel.
 */
export default async function EscolherAulaChamadaPage({ params }: Props) {
  const { turmaId } = await params;
  const id = Number(turmaId);

  if (!Number.isInteger(id) || id <= 0) notFound();

  const [turmas, aulas] = await Promise.all([
    listarTurmas(),
    buscarAulasDaTurma(id).catch((causa) => {
      if (causa instanceof ApiError && causa.isNotFound) notFound();
      throw causa;
    }),
  ]);

  // Em andamento primeiro; empatando, a data mais recente. A API ja manda em
  // ordem, mas ordenar aqui garante que o destaque e' sempre a aula certa.
  const ordenadas = [...aulas.aulas].sort((a, b) => {
    const porAndamento = Number(b.em_andamento) - Number(a.em_andamento);
    if (porAndamento !== 0) return porAndamento;
    return b.data.localeCompare(a.data);
  });

  return (
    <AppShell
      titulo="Chamada"
      controles={
        <SeletorTurma turmas={turmas} turmaAtualId={id} baseRota="/chamada/turma" />
      }
    >
      <div className="flex flex-col gap-7">
        <div>
          <h1
            className="text-text text-2xl font-extrabold sm:text-3xl"
            style={{ fontFamily: "var(--font-geologica)" }}
          >
            Fazer Chamada
          </h1>
          <p className="text-text-body mt-1.5 text-sm">
            Escolha a aula da turma {aulas.turma.nome} para marcar as presenças.
          </p>
        </div>

        <div className="lg:hidden">
          <SeletorTurma turmas={turmas} turmaAtualId={id} baseRota="/chamada/turma" />
        </div>

        <ListaAulasChamada aulas={ordenadas} />
      </div>
    </AppShell>
  );
}
