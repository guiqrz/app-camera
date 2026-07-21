import { notFound } from "next/navigation";

import { ListaAulas } from "@/components/aulas/lista-aulas";
import { SeletorTurma } from "@/components/aulas/seletor-turma";
import { AppShell } from "@/components/layout/app-shell";
import { ApiError, buscarAulasDaTurma, listarTurmas } from "@/lib/api";

type Props = {
  // No App Router os parametros de rota chegam como Promise.
  params: Promise<{ turmaId: string }>;
};

export default async function AulasDaTurmaPage({ params }: Props) {
  const { turmaId } = await params;
  const id = Number(turmaId);

  // Endereco com id nao numerico (/aulas/abc) e' 404, nao erro de servidor.
  if (!Number.isInteger(id) || id <= 0) notFound();

  // As duas chamadas sao independentes: em paralelo, nao em sequencia.
  const [turmas, aulas] = await Promise.all([
    listarTurmas(),
    buscarAulasDaTurma(id).catch((causa) => {
      if (causa instanceof ApiError && causa.isNotFound) notFound();
      throw causa;
    }),
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

        <ListaAulas aulas={aulas.aulas} nomeTurma={aulas.turma.nome} />
      </div>
    </AppShell>
  );
}
