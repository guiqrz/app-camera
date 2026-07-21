import { redirect } from "next/navigation";

import { listarTurmas } from "@/lib/api";

import { AvisoSemTurmas } from "./aviso-sem-turmas";

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
