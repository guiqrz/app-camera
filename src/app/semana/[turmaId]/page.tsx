import { notFound } from "next/navigation";

import { lerDataDaSemana, TelaSemana } from "@/components/aulas/tela-semana";

export const metadata = {
  title: "Minha semana — Cupcam Insights",
};

/**
 * Tela "Minha semana" (feature F12), filtrada por UMA turma.
 *
 * Mesma tela de `/semana`, so' que estreitada. O SeletorTurma navega por
 * caminho, entao a escolha fica no endereco: o professor pode salvar o link e
 * o botao voltar do navegador funciona como esperado.
 */
export default async function SemanaDaTurmaPage({
  params,
  searchParams,
}: {
  params: Promise<{ turmaId: string }>;
  searchParams: Promise<{ data?: string }>;
}) {
  const { turmaId } = await params;
  const { data } = await searchParams;
  const id = Number(turmaId);

  // Endereco com id nao numerico (/semana/abc) e' 404, nao erro de servidor.
  if (!Number.isInteger(id) || id <= 0) notFound();

  return <TelaSemana turmaId={id} data={lerDataDaSemana(data)} />;
}
