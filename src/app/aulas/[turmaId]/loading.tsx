import { AppShell } from "@/components/layout/app-shell";

/**
 * Esqueleto exibido enquanto a API responde.
 *
 * Imita o formato final (titulo, filtros, grade de cartoes) para a pagina
 * nao "pular" quando o conteudo real chega.
 */
export default function CarregandoAulas() {
  return (
    <AppShell titulo="Minhas aulas">
      <div className="flex animate-pulse flex-col gap-7">
        <div className="flex flex-col gap-2">
          <div className="bg-surface-2 h-8 w-52 rounded-lg" />
          <div className="bg-surface-2 h-4 w-80 rounded" />
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="bg-surface-2 h-11 flex-1 rounded-xl" />
          <div className="bg-surface-2 h-11 w-40 rounded-xl" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {Array.from({ length: 8 }, (_, indice) => (
            <div
              key={indice}
              className="border-border-default bg-surface h-52 rounded-2xl border"
            />
          ))}
        </div>
      </div>

      <span className="sr-only" role="status">
        Carregando aulas da turma...
      </span>
    </AppShell>
  );
}
