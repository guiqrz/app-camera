import { redirect } from "next/navigation";

import { listarTurmas } from "@/lib/api";

import { AvisoSemTurmas } from "./aviso-sem-turmas";

// Sem parametro dinamico na rota, o Next tentaria pre-renderizar esta pagina em
// build time (SSG) e o build falharia se a API nao estivesse de pe naquele
// momento. Nao ha o que pre-renderizar aqui: a pagina so' descobre a turma e
// encaminha. Mesmo motivo de /coordenacao.
export const dynamic = "force-dynamic";

/**
 * Entrada da tela "Minhas Aulas".
 *
 * Nao tem conteudo proprio: descobre a primeira turma e encaminha para
 * /aulas/{id}, onde a turma escolhida fica visivel no endereco.
 */
export default async function AulasPage() {
  const turmas = await listarTurmas();

  if (turmas.length === 0) {
    return <AvisoSemTurmas />;
  }

  redirect(`/aulas/${turmas[0].id}`);
}
