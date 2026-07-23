import { AppShell } from "@/components/layout/app-shell";

/** Esqueleto da escolha de aula, no formato da lista final. */
export default function CarregandoEscolhaAula() {
  return (
    <AppShell titulo="Chamada">
      <div className="flex animate-pulse flex-col gap-7">
        <div className="flex flex-col gap-2">
          <div className="bg-surface-2 h-8 w-52 rounded-lg" />
          <div className="bg-surface-2 h-4 w-80 rounded" />
        </div>

        <div className="flex flex-col gap-3">
          {Array.from({ length: 5 }, (_, indice) => (
            <div
              key={indice}
              className="border-border-default bg-surface h-20 rounded-2xl border"
            />
          ))}
        </div>
      </div>

      <span className="sr-only" role="status">
        Carregando aulas para chamada...
      </span>
    </AppShell>
  );
}
