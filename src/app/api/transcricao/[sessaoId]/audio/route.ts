import { lerConfiguracao } from "@/lib/api";

/**
 * Ponte do audio da aula, pro player da tela.
 *
 * Diferente das outras rotas, esta NAO usa lib/api.ts: o corpo e' binario, e
 * `requisitar` devolve JSON. O fetch aqui repassa o stream direto, sem carregar
 * dezenas de MB na memoria do servidor Next.
 */

export const dynamic = "force-dynamic";

export async function GET(
  _requisicao: Request,
  { params }: { params: Promise<{ sessaoId: string }> },
) {
  const { sessaoId } = await params;
  const id = Number(sessaoId);
  if (!Number.isInteger(id) || id <= 0) {
    return new Response("Sessão inválida.", { status: 422 });
  }

  const { baseUrl, apiKey } = lerConfiguracao();
  const resposta = await fetch(`${baseUrl}/sessoes/${id}/audio`, {
    headers: { "X-API-Key": apiKey },
    cache: "no-store",
  });

  if (!resposta.ok) {
    return new Response("Áudio não disponível.", { status: resposta.status });
  }

  return new Response(resposta.body, {
    headers: {
      "Content-Type": "audio/wav",
      // Sem cache: o audio some assim que a transcricao sai, e um player
      // apontando pra um arquivo ja apagado confundiria mais que ajudaria.
      "Cache-Control": "no-store",
    },
  });
}
