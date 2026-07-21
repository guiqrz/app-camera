import { redirect } from "next/navigation";

import { listarTurmas } from "@/lib/api";
import { AppShell } from "@/components/layout/app-shell";

/**
 * Entrada do Relatorio geral (item "Relatorios" do menu).
 *
 * Encaminha para a primeira turma. Sem turmas, mostra o estado vazio.
 */
export default async function RelatoriosPage() {
  const turmas = await listarTurmas();

  if (turmas.length === 0) {
    return (
      <AppShell titulo="Relatórios">
        <div className="border-border-default mx-auto max-w-lg rounded-2xl border border-dashed p-10 text-center">
          <h1 className="text-text text-xl font-extrabold">
            Nenhuma turma cadastrada
          </h1>
          <p className="text-text-body mt-3 text-sm leading-relaxed">
            Cadastre uma turma para ver o relatório consolidado das aulas.
          </p>
        </div>
      </AppShell>
    );
  }

  redirect(`/relatorios/turma/${turmas[0].id}`);
}
