import { VistaAdministracao } from "@/components/administracao/vista-administracao";
import { AppShell } from "@/components/layout/app-shell";
import { buscarVisaoAdmin } from "@/lib/api";

// Sem parametro dinamico na rota, o Next tentaria pre-renderizar esta pagina
// em build time (SSG) e falharia se a API nao estiver de pe naquele momento.
// A visao de administracao precisa ser sempre fresca (ver revalidate:0 em
// buscarVisaoAdmin), entao forcamos renderizacao dinamica a cada requisicao.
export const dynamic = "force-dynamic";

/**
 * Tela "Administracao" — cadastro de turmas e alunos.
 *
 * O servidor busca o retrato inicial (com a X-API-Key, que nunca vai ao
 * navegador) e entrega para a vista interativa. Erros de API sao tratados
 * pelo error.tsx da rota (EstadoErroApi), igual as outras telas.
 */
export default async function AdministracaoPage() {
  const visao = await buscarVisaoAdmin();

  return (
    <AppShell titulo="Administração">
      <VistaAdministracao visaoInicial={visao} />
    </AppShell>
  );
}
