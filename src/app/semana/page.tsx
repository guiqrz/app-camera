import { lerDataDaSemana, TelaSemana } from "@/components/aulas/tela-semana";

// Sem parametro dinamico na rota, o Next tentaria pre-renderizar em build time
// e o build falharia sem a API de pe. Mesmo motivo de /coordenacao.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Minha semana — Cupcam Insights",
};

/**
 * Tela "Minha semana" (feature F12), com TODAS as turmas.
 *
 * Sem filtro por padrao: quem da' aula em varias turmas quer ver a semana
 * inteira de uma vez — e' justamente o "abrir quatro lugares" que a feature
 * existe pra acabar. O seletor esta ali pra quem quiser estreitar, em
 * /semana/{id}.
 */
export default async function SemanaPage({
  searchParams,
}: {
  searchParams: Promise<{ data?: string }>;
}) {
  const { data } = await searchParams;
  return <TelaSemana data={lerDataDaSemana(data)} />;
}
