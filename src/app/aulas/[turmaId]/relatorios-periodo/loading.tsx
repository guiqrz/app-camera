import { AppShell } from "@/components/layout/app-shell";

/** Esqueleto da tela de fim de período enquanto a API responde. */
export default function CarregandoRelatoriosPeriodo() {
  return (
    <AppShell titulo="Fim de período">
      <div className="flex animate-pulse flex-col gap-[13px]">
        <div className="bg-surface-2 ml-[17px] h-4 w-96 max-w-full rounded" />

        <div className="border-border-default bg-surface rounded-2xl border p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="bg-surface-2 h-24 rounded-xl" />
            <div className="bg-surface-2 h-24 rounded-xl" />
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            {Array.from({ length: 3 }, (_, indice) => (
              <div key={indice} className="flex flex-col gap-1.5">
                <div className="bg-surface-2 h-3 w-20 rounded" />
                <div className="bg-surface-2 h-11 rounded-xl" />
              </div>
            ))}
          </div>

          <div className="bg-surface-2 mt-5 h-11 w-56 rounded-xl" />
        </div>
      </div>

      <span className="sr-only" role="status">
        Carregando a tela de fim de período...
      </span>
    </AppShell>
  );
}
