import { PonteTurmaPadrao } from "@/components/layout/ponte-turma-padrao";
import { listarTurmas } from "@/lib/api";

import { AvisoSemTurmas } from "../aulas/aviso-sem-turmas";
import CarregandoEscolhaAula from "./turma/[turmaId]/loading";

// Sem parametro dinamico na rota, o Next tentaria pre-renderizar em build time
// (SSG) e o build falharia sem a API de pe. Nao ha o que pre-renderizar: a
// pagina so' encaminha. Mesmo motivo de /coordenacao.
export const dynamic = "force-dynamic";

/**
 * Entrada da tela "Fazer Chamada".
 *
 * Abre na turma que o professor escolheu em Configuracoes ("Turma padrao"), com
 * a primeira da lista como reserva. A escolha acontece no navegador porque a
 * preferencia mora no localStorage — ver PonteTurmaPadrao.
 */
export default async function ChamadaPage() {
  const turmas = await listarTurmas();

  if (turmas.length === 0) {
    return <AvisoSemTurmas />;
  }

  return (
    <PonteTurmaPadrao turmas={turmas} baseRota="/chamada/turma">
      <CarregandoEscolhaAula />
    </PonteTurmaPadrao>
  );
}
