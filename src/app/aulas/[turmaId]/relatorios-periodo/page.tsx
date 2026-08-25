import { notFound } from "next/navigation";

import { GeradorRelatoriosPeriodo } from "@/components/aulas/gerador-relatorios-periodo";
import { AppShell } from "@/components/layout/app-shell";
import { Breadcrumb, type EloBreadcrumb } from "@/components/layout/breadcrumb";
import { ApiError, buscarAulasDaTurma } from "@/lib/api";

type Props = { params: Promise<{ turmaId: string }> };

export async function generateMetadata({ params }: Props) {
  const { turmaId } = await params;
  const id = Number(turmaId);
  if (!Number.isInteger(id) || id <= 0) return { title: "Fim de período" };

  const aulas = await buscarAulasDaTurma(id).catch(() => null);
  return {
    title: aulas
      ? `Fim de período · ${aulas.turma.nome} — Cupcam Insights`
      : "Fim de período",
  };
}

/**
 * Tela de fim de periodo: conselho de classe (F2) e boletim pra familia (F3).
 *
 * As duas moram na mesma tela porque sao o mesmo material com outro leitor e
 * outro tom — e porque o professor faz as duas no MESMO momento do ano, na
 * mesma sentada. Separa-las em duas telas o faria escolher o periodo duas
 * vezes.
 */
export default async function RelatoriosPeriodoPage({ params }: Props) {
  const { turmaId } = await params;
  const id = Number(turmaId);

  // Endereco com id nao numerico e' 404, nao erro de servidor.
  if (!Number.isInteger(id) || id <= 0) notFound();

  const aulas = await buscarAulasDaTurma(id).catch((causa) => {
    if (causa instanceof ApiError && causa.isNotFound) notFound();
    throw causa;
  });

  const elos: EloBreadcrumb[] = [
    { rotulo: "Minhas aulas", href: `/aulas/${id}` },
    { rotulo: aulas.turma.nome, href: `/aulas/${id}` },
    { rotulo: "Fim de período" },
  ];

  return (
    <AppShell titulo="Fim de período" breadcrumb={<Breadcrumb elos={elos} />}>
      <GeradorRelatoriosPeriodo turmaId={id} nomeTurma={aulas.turma.nome} />
    </AppShell>
  );
}
