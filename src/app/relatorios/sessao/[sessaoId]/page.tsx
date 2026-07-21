import Link from "next/link";
import { notFound } from "next/navigation";

import { VistaRelatorio } from "@/components/relatorio/vista-relatorio";
import { AppShell } from "@/components/layout/app-shell";
import { IconSeta } from "@/components/ui/icons";
import { ApiError, buscarRelatorio } from "@/lib/api";

type Props = {
  params: Promise<{ sessaoId: string }>;
};

export default async function RelatorioPage({ params }: Props) {
  const { sessaoId } = await params;
  const id = Number(sessaoId);

  if (!Number.isInteger(id) || id <= 0) notFound();

  const relatorio = await buscarRelatorio(id).catch((causa) => {
    // Sessao inexistente e' 404, nao erro de servidor.
    if (causa instanceof ApiError && causa.isNotFound) notFound();
    throw causa;
  });

  return (
    <AppShell titulo="Relatório">
      <div className="flex flex-col gap-6">
        {/* Volta para a lista de aulas da turma desta sessao nao e' possivel
            (o relatorio nao carrega o turma_id), entao voltamos para a raiz
            de Minhas Aulas, que redireciona para a primeira turma. */}
        <Link
          href="/aulas"
          className="text-text-brand flex w-fit items-center gap-1.5 text-sm font-bold"
        >
          <span className="rotate-90">
            <IconSeta size={16} />
          </span>
          Voltar para minhas aulas
        </Link>

        <VistaRelatorio relatorio={relatorio} />
      </div>
    </AppShell>
  );
}
