import { notFound } from "next/navigation";

import { VistaChamada } from "@/components/chamada/vista-chamada";
import { AppShell } from "@/components/layout/app-shell";
import { Breadcrumb, type EloBreadcrumb } from "@/components/layout/breadcrumb";
import { ApiError, buscarChamada } from "@/lib/api";
import { dataDoTimestamp, formatarDataCurta } from "@/lib/format";

type Props = {
  params: Promise<{ sessaoId: string }>;
  /** `turma` e' o id da turma de onde o professor veio. */
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
  if (!Number.isInteger(id) || id <= 0) return { title: "Chamada" };

  const chamada = await buscarChamada(id).catch(() => null);
  if (!chamada) return { title: "Chamada" };

  return { title: `Chamada · ${chamada.sessao.turma} — Cupcam Insights` };
}

/**
 * Tela "Fazer Chamada" de uma aula.
 *
 * O servidor busca o retrato inicial da chamada (com a X-API-Key, que nunca
 * vai ao navegador) e entrega para a vista interativa. Dali em diante cada
 * clique do professor grava via /api/chamada (rota nossa) com UI otimista.
 */
export default async function ChamadaDaSessaoPage({ params, searchParams }: Props) {
  const { sessaoId } = await params;
  const { turma: turmaBruta } = await searchParams;
  const id = Number(sessaoId);

  if (!Number.isInteger(id) || id <= 0) notFound();

  const chamada = await buscarChamada(id).catch((causa) => {
    if (causa instanceof ApiError && causa.isNotFound) notFound();
    throw causa;
  });

  /* A chamada da API traz o NOME da turma, nunca o id: quem linka pra ca anexa
     ?turma={id}. Sem o parametro, a trilha aponta pra entrada da secao, que
     encaminha pra turma padrao do professor. */
  const turmaId = lerIdDaTurma(turmaBruta);
  const hrefTurma = turmaId === null ? "/chamada" : `/chamada/turma/${turmaId}`;

  const elos: EloBreadcrumb[] = [
    { rotulo: "Chamada", href: hrefTurma },
    { rotulo: chamada.sessao.turma, href: hrefTurma },
    { rotulo: formatarDataCurta(dataDoTimestamp(chamada.sessao.iniciada_em)) },
  ];

  return (
    <AppShell titulo="Chamada" breadcrumb={<Breadcrumb elos={elos} />}>
      <VistaChamada inicial={chamada} sessaoId={id} />
    </AppShell>
  );
}
