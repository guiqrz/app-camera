import { AppShell } from "@/components/layout/app-shell";

/** Esqueleto da chamada: cards de resumo + lista de alunos. */
export default function CarregandoChamada() {
  return (
    <AppShell titulo="Chamada">
      <div className="flex animate-pulse flex-col gap-7">
        <div className="flex flex-col gap-2">
          <div className="bg-surface-2 h-8 w-52 rounded-lg" />
          <div className="bg-surface-2 h-4 w-80 rounded" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, indice) => (
            <div
              key={indice}
              className="border-border-default bg-surface h-32 rounded-2xl border"
            />
          ))}
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="bg-surface-2 h-11 flex-1 rounded-xl" />
          <div className="bg-surface-2 h-11 w-64 rounded-xl" />
        </div>

        <div className="border-border-default bg-surface h-96 rounded-2xl border" />
      </div>

      <span className="sr-only" role="status">
        Carregando chamada da aula...
      </span>
    </AppShell>
  );
}
