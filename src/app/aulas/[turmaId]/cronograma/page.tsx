import { notFound } from "next/navigation";

import { EditorCronograma } from "@/components/aulas/editor-cronograma";
import { AppShell } from "@/components/layout/app-shell";
import { Breadcrumb, type EloBreadcrumb } from "@/components/layout/breadcrumb";
import { ApiError, buscarAulasDaTurma, buscarCronograma } from "@/lib/api";

type Props = { params: Promise<{ turmaId: string }> };

export async function generateMetadata({ params }: Props) {
  const { turmaId } = await params;
  const id = Number(turmaId);
  if (!Number.isInteger(id) || id <= 0) return { title: "Cronograma" };

  const aulas = await buscarAulasDaTurma(id).catch(() => null);
  return {
    title: aulas
      ? `Cronograma · ${aulas.turma.nome} — Cupcam Insights`
      : "Cronograma",
  };
}

/**
 * Tela do cronograma do bimestre (feature F9).
 *
 * E' a BASE do eixo de futuro: a F10 (alerta de atraso), a F11 (sugestao da
 * proxima aula) e a F12 (preparacao da semana) leem o que e' definido aqui.
 * Sem cronograma, nenhuma das tres existe — e a F11 seria insegura, porque o
 * modelo teria que inventar a sequencia pedagogica em vez de ler a que o
 * professor escreveu.
 */
export default async function CronogramaPage({ params }: Props) {
  const { turmaId } = await params;
  const id = Number(turmaId);

  // Endereco com id nao numerico e' 404, nao erro de servidor.
  if (!Number.isInteger(id) || id <= 0) notFound();

  const [aulas, cronograma] = await Promise.all([
    buscarAulasDaTurma(id).catch((causa) => {
      if (causa instanceof ApiError && causa.isNotFound) notFound();
      throw causa;
    }),
    // Turma sem cronograma devolve `tem_cronograma: false`, nunca null nem
    // 404 — e' o estado normal de quem ainda nao montou um. O `.catch` cobre
    // so' falha de rede.
    buscarCronograma(id).catch(() => null),
  ]);

  // MEDIDO CONTRA A API REAL em 24/08: a rota usa `tem_cronograma` como
  // discriminante, igual as de atraso e proxima aula. O editor quer o
  // cronograma em si, ou null quando nao ha — a conversao acontece aqui.
  const cronogramaInicial =
    cronograma?.tem_cronograma === true ? cronograma : null;

  const elos: EloBreadcrumb[] = [
    { rotulo: "Minhas aulas", href: `/aulas/${id}` },
    { rotulo: aulas.turma.nome, href: `/aulas/${id}` },
    { rotulo: "Cronograma" },
  ];

  return (
    <AppShell titulo="Cronograma" breadcrumb={<Breadcrumb elos={elos} />}>
      <EditorCronograma
        turmaId={id}
        nomeTurma={aulas.turma.nome}
        inicial={cronogramaInicial}
      />
    </AppShell>
  );
}
