import { redirect } from "next/navigation";

import { listarTurmas } from "@/lib/api";

import { AvisoSemTurmas } from "../aulas/aviso-sem-turmas";

/**
 * Entrada da tela "Fazer Chamada".
 *
 * Mesmo desenho da entrada de Minhas Aulas: descobre a primeira turma e
 * encaminha para /chamada/turma/{id}, onde o professor escolhe a aula.
 */
export default async function ChamadaPage() {
  const turmas = await listarTurmas();

  if (turmas.length === 0) {
    return <AvisoSemTurmas />;
  }

  redirect(`/chamada/turma/${turmas[0].id}`);
}
