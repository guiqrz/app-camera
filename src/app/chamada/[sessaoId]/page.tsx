import { notFound } from "next/navigation";

import { VistaChamada } from "@/components/chamada/vista-chamada";
import { AppShell } from "@/components/layout/app-shell";
import { ApiError, buscarChamada } from "@/lib/api";

type Props = {
  params: Promise<{ sessaoId: string }>;
};

/**
 * Tela "Fazer Chamada" de uma aula.
 *
 * O servidor busca o retrato inicial da chamada (com a X-API-Key, que nunca
 * vai ao navegador) e entrega para a vista interativa. Dali em diante cada
 * clique do professor grava via /api/chamada (rota nossa) com UI otimista.
 */
export default async function ChamadaDaSessaoPage({ params }: Props) {
  const { sessaoId } = await params;
  const id = Number(sessaoId);

  if (!Number.isInteger(id) || id <= 0) notFound();

  const chamada = await buscarChamada(id).catch((causa) => {
    if (causa instanceof ApiError && causa.isNotFound) notFound();
    throw causa;
  });

  return (
    <AppShell titulo="Chamada">
      <VistaChamada inicial={chamada} sessaoId={id} />
    </AppShell>
  );
}
