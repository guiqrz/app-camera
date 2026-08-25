import { AppShell } from "@/components/layout/app-shell";

/**
 * Esqueleto de "Minha semana" enquanto a API responde.
 *
 * Imita o formato final (bloco de pendencias no topo, depois um cartao por dia)
 * para a pagina nao "pular" quando o conteudo real chega.
 */
export default function CarregandoSemana() {
  return (
    <AppShell titulo="Minha semana">
      <div className="flex animate-pulse flex-col gap-[13px]">
        <div className="bg-surface-2 ml-[17px] h-4 w-80 max-w-full rounded" />

        {/* O bloco de pendencias. */}
        <div className="border-border-default bg-surface rounded-2xl border p-5">
          <div className="flex items-center gap-3">
            <div className="bg-surface-2 h-[34px] w-[34px] flex-none rounded-[10px]" />
            <div className="flex flex-1 flex-col gap-1.5">
              <div className="bg-surface-2 h-4 w-64 max-w-full rounded" />
              <div className="bg-surface-2 h-3 w-40 rounded" />
            </div>
          </div>
        </div>

        {/* Tres dias de aula. */}
        {Array.from({ length: 3 }, (_, indice) => (
          <div
            key={indice}
            className="border-border-default bg-surface rounded-2xl border p-5"
          >
            <div className="bg-surface-2 mb-3 h-3 w-28 rounded" />
            <div className="flex flex-col gap-2">
              <div className="bg-surface-2 h-11 rounded-xl" />
              <div className="bg-surface-2 h-11 rounded-xl" />
            </div>
          </div>
        ))}
      </div>

      <span className="sr-only" role="status">
        Carregando as aulas da semana...
      </span>
    </AppShell>
  );
}
