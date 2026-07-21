import { AppShell } from "@/components/layout/app-shell";

/** Esqueleto do relatorio enquanto a API responde. */
export default function CarregandoRelatorio() {
  return (
    <AppShell titulo="Relatório">
      <div className="flex animate-pulse flex-col gap-7">
        <div className="flex flex-col gap-2">
          <div className="bg-surface-2 h-8 w-64 rounded-lg" />
          <div className="bg-surface-2 h-4 w-80 rounded" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="border-border-default bg-surface h-32 rounded-2xl border" />
          ))}
        </div>

        <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
          <div className="border-border-default bg-surface h-72 rounded-2xl border" />
          <div className="flex flex-col gap-5">
            <div className="border-border-default bg-surface h-40 rounded-2xl border" />
            <div className="border-border-default bg-surface h-40 rounded-2xl border" />
          </div>
        </div>
      </div>

      <span className="sr-only" role="status">
        Carregando relatório da aula...
      </span>
    </AppShell>
  );
}
