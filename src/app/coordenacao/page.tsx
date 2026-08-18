import { VistaAdministracao } from "@/components/coordenacao/vista-administracao";
import { AppShell } from "@/components/layout/app-shell";
import { buscarPanoramaCoordenacao, buscarVisaoAdmin } from "@/lib/api";

// Sem parametro dinamico na rota, o Next tentaria pre-renderizar esta pagina
// em build time (SSG) e falharia se a API nao estiver de pe naquele momento.
// A visao de administracao precisa ser sempre fresca (ver revalidate:0 em
// buscarVisaoAdmin), entao forcamos renderizacao dinamica a cada requisicao.
export const dynamic = "force-dynamic";

/**
 * Tela "Coordenacao" — cadastro da escola e o que falta configurar.
 *
 * O servidor busca o retrato inicial (com a X-API-Key, que nunca vai ao
 * navegador) e entrega para a vista interativa. Erros de API sao tratados
 * pelo error.tsx da rota (EstadoErroApi), igual as outras telas.
 *
 * Duas rotas em PARALELO, nao em sequencia: sao independentes, e encadear
 * somaria as duas latencias no tempo de abertura da tela. `Promise.all`
 * tambem propaga a primeira falha, que e' o comportamento certo aqui — meia
 * tela nao serve pra ninguem, e o error.tsx cobre o caso.
 */
export default async function AdministracaoPage() {
  const [visao, panorama] = await Promise.all([
    buscarVisaoAdmin(),
    buscarPanoramaCoordenacao(),
  ]);

  return (
    <AppShell titulo="Coordenação">
      <VistaAdministracao visaoInicial={visao} panoramaInicial={panorama} />
    </AppShell>
  );
}
