import { AppShell } from "@/components/layout/app-shell";
import { PainelConversas } from "@/components/ia/painel-conversas";
import { lerConfiguracaoIA, listarConversas } from "@/lib/api";

// Sem parametro dinamico na rota, o Next tentaria pre-renderizar esta pagina em
// build time (SSG) e o build falharia se a API nao estivesse de pe naquele
// momento. Mesmo motivo de /aulas e /coordenacao.
export const dynamic = "force-dynamic";

type Props = {
  /** `sessao` chega do atalho "Conversar sobre esta aula" do relatorio. */
  searchParams: Promise<{ sessao?: string }>;
};

/**
 * Tela do Cup AI: conversas anteriores e o campo pra comecar uma nova.
 *
 * As duas leituras vao em paralelo porque nao dependem uma da outra — em serie,
 * o professor esperaria a soma das duas idas ate a API da sala.
 */
export default async function IaPage({ searchParams }: Props) {
  const [{ sessao }, conversas, configuracao] = await Promise.all([
    searchParams,
    listarConversas(),
    lerConfiguracaoIA(),
  ]);

  const sessaoId = Number(sessao);
  const sessaoAnexada =
    Number.isInteger(sessaoId) && sessaoId > 0 ? sessaoId : null;

  return (
    <AppShell titulo="Cup AI">
      <PainelConversas
        conversasIniciais={conversas}
        chaveConfigurada={configuracao.chave_configurada}
        sessaoAnexada={sessaoAnexada}
      />
    </AppShell>
  );
}
