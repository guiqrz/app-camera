import { notFound } from "next/navigation";

import { VistaRelatorio } from "@/components/relatorio/vista-relatorio";
import { AppShell } from "@/components/layout/app-shell";
import { Breadcrumb, type EloBreadcrumb } from "@/components/layout/breadcrumb";
import { ApiError, buscarRelatorio } from "@/lib/api";
import { dataDoTimestamp, formatarDataCurta } from "@/lib/format";

type Props = {
  params: Promise<{ sessaoId: string }>;
  /** `turma` e' o id da turma de onde o professor veio (ver JSDoc abaixo). */
  searchParams: Promise<{ turma?: string }>;
};

/** Id de turma valido vindo da URL, ou null se ausente/lixo. */
function lerIdDaTurma(bruto: string | undefined): number | null {
  if (!bruto) return null;
  const id = Number(bruto);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function generateMetadata({ params }: Props) {
  const { sessaoId } = await params;
  const id = Number(sessaoId);
  if (!Number.isInteger(id) || id <= 0) return { title: "Relatório" };

  const relatorio = await buscarRelatorio(id).catch(() => null);
  if (!relatorio) return { title: "Relatório" };

  const data = formatarDataCurta(dataDoTimestamp(relatorio.sessao.iniciada_em));
  return { title: `${relatorio.sessao.turma} · ${data} — Cupcam Insights` };
}

export default async function RelatorioPage({ params, searchParams }: Props) {
  const { sessaoId } = await params;
  const { turma: turmaBruta } = await searchParams;
  const id = Number(sessaoId);

  if (!Number.isInteger(id) || id <= 0) notFound();

  const relatorio = await buscarRelatorio(id).catch((causa) => {
    // Sessao inexistente e' 404, nao erro de servidor.
    if (causa instanceof ApiError && causa.isNotFound) notFound();
    throw causa;
  });

  /* De qual turma o professor veio.
     O relatorio da API traz o NOME da turma (`sessao.turma`), nunca o id — por
     isso quem linka pra ca anexa ?turma={id}. Sem esse parametro (link antigo,
     URL colada na mao) caimos em /aulas, que encaminha pra primeira turma: e' o
     comportamento antigo, preservado como reserva. */
  const turmaId = lerIdDaTurma(turmaBruta);
  const hrefAulas = turmaId === null ? "/aulas" : `/aulas/${turmaId}`;

  const elos: EloBreadcrumb[] = [
    { rotulo: "Minhas aulas", href: hrefAulas },
    { rotulo: relatorio.sessao.turma, href: hrefAulas },
    { rotulo: formatarDataCurta(dataDoTimestamp(relatorio.sessao.iniciada_em)) },
  ];

  return (
    <AppShell titulo="Relatório" breadcrumb={<Breadcrumb elos={elos} />}>
      <VistaRelatorio relatorio={relatorio} />
    </AppShell>
  );
}
