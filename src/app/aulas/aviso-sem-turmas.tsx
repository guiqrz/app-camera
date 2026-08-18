import Link from "next/link";

import { AppShell } from "@/components/layout/app-shell";

/** Estado vazio: a escola ainda nao cadastrou nenhuma turma. */
export function AvisoSemTurmas() {
  return (
    <AppShell titulo="Minhas aulas">
      <div className="border-border-default mx-auto max-w-lg rounded-2xl border border-dashed p-10 text-center">
        <h1 className="text-text text-xl font-semibold">Nenhuma turma cadastrada</h1>
        <p className="text-text-body mt-3 text-sm leading-relaxed">
          O CUPCAM ainda não tem turmas no banco de dados. Cadastre uma turma
          para que as aulas monitoradas apareçam aqui.
        </p>
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
