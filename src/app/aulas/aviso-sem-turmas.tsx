import Link from "next/link";

import { AppShell } from "@/components/layout/app-shell";
import { lerSessaoDoServidor } from "@/lib/sessao-cookie";

type Props = {
  /** Titulo da tela no AppShell. */
  titulo?: string;
  /** Frase do estado vazio pra quem cadastra turma (admin). */
  descricao?: string;
};

/**
 * Estado vazio: nenhuma turma pra mostrar.
 *
 * Desde os papeis (03/10/2026) o motivo depende de quem olha. Pro professor,
 * "sem turma" quer dizer que a coordenacao ainda nao atribuiu aula a ele -- e
 * ele nao pode abrir a Coordenacao, entao o botao "Cadastrar turma" seria uma
 * porta trancada. Pro admin, o aviso de sempre.
 */
export async function AvisoSemTurmas({
  titulo = "Minhas aulas",
  descricao = "O CUPCAM ainda não tem turmas no banco de dados. Cadastre uma turma para que as aulas monitoradas apareçam aqui.",
}: Props = {}) {
  const sessao = await lerSessaoDoServidor();

  if (sessao?.papel === "professor") {
    return (
      <AppShell titulo={titulo}>
        <div className="border-border-default mx-auto max-w-lg rounded-2xl border border-dashed p-10 text-center">
          <h1 className="text-text text-xl font-semibold">Nenhuma aula atribuída</h1>
          <p className="text-text-body mt-3 text-sm leading-relaxed">
            A coordenação ainda não te passou aulas. Quando ela atribuir uma
            aula a você na grade, a turma aparece aqui.
          </p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell titulo={titulo}>
      <div className="border-border-default mx-auto max-w-lg rounded-2xl border border-dashed p-10 text-center">
        <h1 className="text-text text-xl font-semibold">Nenhuma turma cadastrada</h1>
        <p className="text-text-body mt-3 text-sm leading-relaxed">{descricao}</p>
        {/* Sem este botao o aviso descrevia a saida sem abri-la: o professor
            tinha que descobrir sozinho que turma se cadastra em Coordenacao. */}
        <Link
          href="/coordenacao"
          className="mt-6 inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-colors"
          style={{ background: "var(--primary)" }}
        >
          Cadastrar turma
        </Link>
      </div>
    </AppShell>
  );
}
