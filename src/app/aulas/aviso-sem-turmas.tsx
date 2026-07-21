import { AppShell } from "@/components/layout/app-shell";

/** Estado vazio: a escola ainda nao cadastrou nenhuma turma. */
export function AvisoSemTurmas() {
  return (
    <AppShell titulo="Minhas aulas">
      <div className="border-border-default mx-auto max-w-lg rounded-2xl border border-dashed p-10 text-center">
        <h1 className="text-text text-xl font-extrabold">Nenhuma turma cadastrada</h1>
        <p className="text-text-body mt-3 text-sm leading-relaxed">
          O CUPCAM ainda não tem turmas no banco de dados. Cadastre uma turma
          para que as aulas monitoradas apareçam aqui.
        </p>
      </div>
    </AppShell>
  );
}
