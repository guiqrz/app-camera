import Link from "next/link";

import { listarTurmas } from "@/lib/api";
import { AppShell } from "@/components/layout/app-shell";
import { PonteTurmaPadrao } from "@/components/layout/ponte-turma-padrao";

import CarregandoRelatorioGeral from "./turma/[turmaId]/loading";

// Sem parametro dinamico na rota, o Next tentaria pre-renderizar em build time
// (SSG) e o build falharia sem a API de pe. Nao ha o que pre-renderizar: a
// pagina so' encaminha. Mesmo motivo de /coordenacao.
export const dynamic = "force-dynamic";

/**
 * Entrada do Relatorio geral (item "Relatorios" do menu).
 *
 * Abre na turma que o professor escolheu em Configuracoes ("Turma padrao"), com
 * a primeira da lista como reserva — ver PonteTurmaPadrao. Sem turmas, mostra o
 * estado vazio com o caminho para cadastrar.
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
          {/* Estado vazio que abre a saida, em vez de so' descreve-la. */}
          <Link
            href="/coordenacao"
            className="mt-6 inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-extrabold text-white transition-colors"
            style={{ background: "var(--primary)" }}
          >
            Cadastrar turma
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <PonteTurmaPadrao turmas={turmas} baseRota="/relatorios/turma">
      <CarregandoRelatorioGeral />
    </PonteTurmaPadrao>
  );
}
