import { AppShell } from "@/components/layout/app-shell";

/** Esqueleto do relatorio geral enquanto a API responde. */
export default function CarregandoRelatorioGeral() {
  return (
    <AppShell titulo="Relatórios">
      <div className="flex animate-pulse flex-col gap-7">
        <div className="flex flex-col gap-2">
          <div className="bg-surface-2 h-8 w-72 rounded-lg" />
          <div className="bg-surface-2 h-4 w-96 max-w-full rounded" />
        </div>

        <div className="grid grid-cols-1 gap-4 min-[560px]:grid-flow-col">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="border-border-default bg-surface h-32 rounded-2xl border" />
          ))}
        </div>

        <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
          <div className="border-border-default bg-surface h-72 rounded-2xl border" />
          <div className="border-border-default bg-surface h-72 rounded-2xl border" />
        </div>
      </div>

      <span className="sr-only" role="status">
        Carregando relatório geral da turma...
      </span>
    </AppShell>
  );
}
