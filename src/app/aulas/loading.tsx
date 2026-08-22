import { AppShell } from "@/components/layout/app-shell";

/**
 * Esqueleto da tela "Minhas aulas" (visao consolidada, todas as turmas).
 *
 * POR QUE ESTE ARQUIVO EXISTE (22/08/2026)
 *
 * `/aulas` e' um Server Component que espera duas chamadas de API antes de
 * devolver qualquer HTML (listarTurmas + buscarVisaoGeral). Sem um
 * `loading.tsx`, o Next segura a NAVEGACAO INTEIRA ate essas chamadas
 * responderem: quem clicava em "Minhas aulas" no menu ficava com a tela
 * anterior congelada, sem nenhum sinal de que o clique funcionou.
 *
 * Com este arquivo a troca de tela e' imediata — o esqueleto entra na hora e
 * o conteudo o substitui quando chega. O tempo total ate o dado aparecer e' o
 * mesmo; o que muda e' que a interface para de parecer travada.
 *
 * O formato imita o da tela pronta (paragrafo, cartoes de numero, agenda) pra
 * o conteudo real nao "pular" quando entra no lugar.
 */
export default function CarregandoAulas() {
  return (
    <AppShell titulo="Minhas aulas">
      <div className="flex animate-pulse flex-col gap-[13px]">
        {/* A linha de apoio embaixo do titulo */}
        <div className="bg-surface-2 h-[21px] w-96 max-w-full rounded" />

        {/* Os cartoes de numero da semana */}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, indice) => (
            <div
              key={indice}
              className="border-border-default bg-surface h-24 rounded-2xl border"
            />
          ))}
        </div>

        {/* A agenda da semana, o bloco alto da tela */}
        <div className="border-border-default bg-surface h-80 rounded-2xl border" />

        {/* Distribuicao de materias + lembretes, lado a lado no desktop */}
        <div className="grid gap-3 lg:grid-cols-2">
          <div className="border-border-default bg-surface h-56 rounded-2xl border" />
          <div className="border-border-default bg-surface h-56 rounded-2xl border" />
        </div>
      </div>

      {/* role="status" faz o leitor de tela anunciar a espera; sr-only o mantem
          fora da tela pra quem enxerga, que ja' ve o esqueleto pulsando. */}
      <span className="sr-only" role="status">
        Carregando suas aulas...
      </span>
    </AppShell>
  );
}
