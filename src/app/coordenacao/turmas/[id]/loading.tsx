import { AppShell } from "@/components/layout/app-shell";

/**
 * Esqueleto da pagina de UMA turma dentro da Coordenacao.
 *
 * Mesma razao dos outros `loading.tsx` criados em 22/08/2026: a pagina espera
 * a API antes de existir HTML, e sem este arquivo o clique numa turma da lista
 * ficava sem resposta visivel ate o dado chegar.
 */
export default function CarregandoTurma() {
  return (
    <AppShell titulo="Coordenação">
      <div className="flex animate-pulse flex-col gap-4">
        {/* Cabecalho da turma: nome e a linha de apoio */}
        <div className="flex flex-col gap-2">
          <div className="bg-surface-2 h-8 w-64 rounded-lg" />
          <div className="bg-surface-2 h-4 w-80 max-w-full rounded" />
        </div>

        {/* A grade semanal, o bloco alto da tela */}
        <div className="border-border-default bg-surface h-72 rounded-2xl border" />

        {/* A lista de alunos */}
        <div className="border-border-default bg-surface h-64 rounded-2xl border" />
      </div>

      <span className="sr-only" role="status">
        Carregando a turma...
      </span>
    </AppShell>
  );
}
