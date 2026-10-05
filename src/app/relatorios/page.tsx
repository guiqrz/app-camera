
import { PonteTurmaPadrao } from "@/components/layout/ponte-turma-padrao";
import { listarTurmas } from "@/lib/api";

import { AvisoSemTurmas } from "../aulas/aviso-sem-turmas";

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
      <AvisoSemTurmas
        titulo="Relatórios"
        descricao="Cadastre uma turma para ver o relatório consolidado das aulas."
      />
    );
  }

  return (
    <PonteTurmaPadrao turmas={turmas} baseRota="/relatorios/turma">
      <CarregandoRelatorioGeral />
    </PonteTurmaPadrao>
  );
}
