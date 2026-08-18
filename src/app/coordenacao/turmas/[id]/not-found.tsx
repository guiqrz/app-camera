import Link from "next/link";

import { AppShell } from "@/components/layout/app-shell";
import { IconTurma } from "@/components/ui/icons";

/**
 * Turma inexistente — id fora da lista, ou turma excluida em outra aba com o
 * link ainda aberto aqui.
 *
 * Dentro do AppShell de proposito: o coordenador continua com o menu lateral e
 * volta pra Coordenacao num clique, em vez de cair numa pagina 404 solta que
 * o obriga a usar o botao de voltar do navegador.
 */
export default function TurmaNaoEncontrada() {
  return (
    <AppShell titulo="Coordenação">
      <div className="flex flex-col items-center gap-3 px-6 py-20 text-center">
        <span className="text-text-muted" aria-hidden>
          <IconTurma size={32} />
        </span>
        <h1 className="text-text text-lg font-semibold">Turma não encontrada.</h1>
        <p className="text-text-muted max-w-sm text-sm">
          Ela pode ter sido excluída, ou o endereço está errado.
        </p>
        <Link
          href="/coordenacao"
          className="mt-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white"
          style={{ background: "var(--primary)" }}
        >
          Voltar para Coordenação
        </Link>
      </div>
    </AppShell>
  );
}
