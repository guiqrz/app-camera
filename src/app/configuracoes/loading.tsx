import { AppShell } from "@/components/layout/app-shell";

/**
 * Esqueleto da tela "Configuracoes".
 *
 * Mesma razao do `loading.tsx` de /aulas (22/08/2026). Aqui ela pesa ainda
 * mais: esta e' a tela que a pessoa abre JUSTAMENTE quando desconfia que algo
 * nao esta funcionando — e ate hoje ela demorava a aparecer pelo mesmo motivo
 * que a pessoa veio investigar.
 *
 * A pagina le turmas, aulas e estado da camera no servidor antes de devolver
 * HTML. As leituras ja' sao tolerantes a falha (a tela abre com o backend
 * fora), mas tolerar falha nao e' o mesmo que responder rapido: enquanto a API
 * pensa, sem este arquivo nao havia nada na tela.
 */
export default function CarregandoConfiguracoes() {
  return (
    <AppShell titulo="Configurações">
      <div className="flex animate-pulse flex-col gap-4">
        {/* As duas abas do topo: Geral e Privacidade */}
        <div className="flex gap-2">
          <div className="bg-surface-2 h-9 w-24 rounded-xl" />
          <div className="bg-surface-2 h-9 w-32 rounded-xl" />
        </div>

        {/* Os grupos de ajuste — Preferencias, Assistente, Diagnostico */}
        {Array.from({ length: 3 }, (_, indice) => (
          <div key={indice} className="flex flex-col gap-2">
            {/* O rotulo em maiusculas acima de cada grupo */}
            <div className="bg-surface-2 h-3 w-32 rounded" />
            <div className="border-border-default bg-surface h-52 rounded-2xl border" />
          </div>
        ))}
      </div>

      <span className="sr-only" role="status">
        Carregando as configurações...
      </span>
    </AppShell>
  );
}
