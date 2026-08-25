import { AppShell } from "@/components/layout/app-shell";

/**
 * Esqueleto do cronograma enquanto a API responde.
 *
 * Imita o formato final (formulario em cima, lista de conteudos embaixo) para
 * a pagina nao "pular" quando o conteudo real chega.
 */
export default function CarregandoCronograma() {
  return (
    <AppShell titulo="Cronograma">
      <div className="flex animate-pulse flex-col gap-[13px]">
        <div className="bg-surface-2 ml-[17px] h-4 w-96 max-w-full rounded" />

        <div className="border-border-default bg-surface rounded-2xl border p-5">
          <div className="grid gap-4 sm:grid-cols-3">
            {Array.from({ length: 3 }, (_, indice) => (
              <div key={indice} className="flex flex-col gap-1.5">
                <div className="bg-surface-2 h-3 w-24 rounded" />
                <div className="bg-surface-2 h-11 rounded-xl" />
              </div>
            ))}
          </div>

          <div className="mt-5 flex flex-col gap-1.5">
            <div className="bg-surface-2 h-3 w-44 rounded" />
            <div className="bg-surface-2 h-44 rounded-xl" />
          </div>

          <div className="mt-5 flex gap-3">
            <div className="bg-surface-2 h-11 w-36 rounded-xl" />
            <div className="bg-surface-2 h-11 w-44 rounded-xl" />
          </div>
        </div>
      </div>

      <span className="sr-only" role="status">
        Carregando cronograma da turma...
      </span>
    </AppShell>
  );
}
