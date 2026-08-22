import { AppShell } from "@/components/layout/app-shell";

/**
 * Esqueleto da tela "Coordenacao".
 *
 * Mesma razao do `loading.tsx` de /aulas (22/08/2026): a pagina espera duas
 * chamadas de API em paralelo (buscarVisaoAdmin + buscarPanoramaCoordenacao)
 * antes de existir HTML, e sem este arquivo o clique no menu nao produzia
 * reacao nenhuma ate a resposta chegar.
 *
 * Esta e' das telas mais pesadas do app — quanto mais lenta a origem, mais
 * este esqueleto importa.
 */
export default function CarregandoCoordenacao() {
  return (
    <AppShell titulo="Coordenação">
      <div className="flex animate-pulse flex-col gap-4">
        {/* A fileira de abas do topo (Turmas, Materias, Alunos...) */}
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 4 }, (_, indice) => (
            <div key={indice} className="bg-surface-2 h-9 w-28 rounded-xl" />
          ))}
        </div>

        {/* O painel de pendencias, quando existe algo a configurar */}
        <div className="border-border-default bg-surface h-28 rounded-2xl border" />

        {/* A lista/grade do conteudo da aba escolhida */}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, indice) => (
            <div
              key={indice}
              className="border-border-default bg-surface h-40 rounded-2xl border"
            />
          ))}
        </div>
      </div>

      <span className="sr-only" role="status">
        Carregando a coordenação...
      </span>
    </AppShell>
  );
}
