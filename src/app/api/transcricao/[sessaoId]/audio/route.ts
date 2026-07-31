/**
 * Ponte do audio da aula, pro player da tela.
 *
 * Diferente das outras rotas, esta NAO usa lib/api.ts: o corpo e' binario, e
 * `requisitar` devolve JSON. O fetch aqui repassa o stream direto, sem carregar
 * dezenas de MB na memoria do servidor Next. Mesmo motivo do irmao binario em
 * admin/alunos/[ra]/foto/route.ts: le as variaveis de ambiente na mao, sem
 * passar por `lerConfiguracao` (que lanca `Error` cru, nao pensado pra um
 * handler devolver ao navegador).
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

  const baseUrl = process.env.CUPCAM_API_URL?.replace(/\/$/, "");
  const apiKey = process.env.CUPCAM_API_KEY;
  if (!baseUrl || !apiKey) {
    return new Response("API não configurada.", { status: 500 });
  }

  let resposta: Response;
  try {
    resposta = await fetch(`${baseUrl}/sessoes/${id}/audio`, {
      headers: { "X-API-Key": apiKey },
      cache: "no-store",
    });
  } catch {
    return new Response("Falha ao falar com a API.", { status: 502 });
  }

  // 404 e' esperado (aula sem audio guardado, ou ja expirado): repassa pro
  // <audio> cair no erro de carregamento, sem tratar como falha real.
  if (resposta.status === 404) {
    return new Response("Áudio não disponível.", { status: 404 });
  }
  if (!resposta.ok) {
    // Nunca repassa o status cru daqui pra baixo: um 401 seria a
    // CUPCAM_API_KEY do SERVIDOR vencida, e o navegador leria como se o
    // professor e' quem estivesse desautenticado. Mesma logica de statusSeguro.
    return new Response("Falha ao buscar o áudio.", { status: 502 });
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
