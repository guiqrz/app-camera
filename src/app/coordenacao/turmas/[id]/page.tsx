import { notFound } from "next/navigation";

import { VistaTurma } from "@/components/coordenacao/vista-turma";
import { AppShell } from "@/components/layout/app-shell";
import { buscarVisaoAdmin } from "@/lib/api";

// A visao de administracao precisa ser sempre fresca (ver revalidate:0 em
// buscarVisaoAdmin): o nome e a sala da turma podem ter mudado em outra aba.
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

/**
 * Pagina de uma turma — dados da turma e a grade semanal de aulas.
 *
 * A turma sai de `/admin/visao` em vez de uma rota propria porque o backend
 * NAO expoe `GET /admin/turmas/{id}`: a visao ja' traz a lista completa com o
 * `total_alunos` que o cabecalho mostra, entao filtrar aqui evita inventar uma
 * rota nova no backend so' pra esta tela.
 *
 * O servidor busca com a X-API-Key, que nunca vai ao navegador. Erros de API
 * caem no error.tsx de /coordenacao, herdado por esta rota; id inexistente ou
 * malformado vira 404 de verdade, nao uma tela vazia.
 */
export default async function TurmaPage({ params }: Props) {
  const { id } = await params;

  const idNumero = Number(id);
  if (!Number.isInteger(idNumero) || idNumero <= 0) notFound();

  const visao = await buscarVisaoAdmin();
  const turma = visao.turmas.find((candidata) => candidata.id === idNumero);
  if (!turma) notFound();

  return (
    <AppShell titulo="Coordenação">
      <VistaTurma turmaInicial={turma} />
    </AppShell>
  );
}
