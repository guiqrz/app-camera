import { NextResponse } from "next/server";

import { statusSeguro } from "@/app/api/admin/_lib/status-seguro";
import { ApiError, excluirAudioDaSessao } from "@/lib/api";

/**
 * Ponte do audio da aula: tocar (GET), checar existencia (HEAD), excluir (DELETE).
 *
 * GET e HEAD NAO usam lib/api.ts: o corpo e' binario, e `requisitar` devolve
 * JSON. O fetch neles repassa o stream direto, sem carregar dezenas de MB na
 * memoria do servidor Next. Mesmo motivo do irmao binario em
 * admin/alunos/[ra]/foto/route.ts: leem as variaveis de ambiente na mao, sem
 * passar por `lerConfiguracao` (que lanca `Error` cru, nao pensado pra um
 * handler devolver ao navegador).
 *
 * O DELETE devolve JSON, entao passa por lib/api.ts como as demais rotas de
 * escrita, com o mesmo tratamento de erro.
 */

export const dynamic = "force-dynamic";

/**
 * "O audio ainda existe?" — sem baixar o audio.
 *
 * TEMPORARIO, junto com a retencao de alguns dias: a tela so' mostra o player
 * quando o WAV esta no disco, e sem este HEAD ela teria que pedir o arquivo
 * INTEIRO (dezenas de MB) pra descobrir isso em toda visita ao relatorio.
 *
 * Sem um `HEAD` exportado, o Next responderia via `GET` e baixaria o corpo
 * mesmo assim, que e' justamente o custo que este handler evita.
 *
 * Pergunta a API com `GET` + `Range: bytes=0-0`, NAO com `HEAD`: a rota de la'
 * e' declarada `@app.get`, e o FastAPI devolve 405 pra HEAD (verificado em
 * 31/07/2026 — nao e' o comportamento automatico que se costuma supor). Com o
 * Range o servidor manda 1 byte em vez do WAV inteiro, entao o custo continua
 * desprezivel sem precisar de rota nova no backend.
 *
 * Devolve so' o status: 200 (existe), 404 (prazo vencido ou aula sem audio —
 * caso NORMAL), 502 (a sala nao respondeu).
 */
export async function HEAD(
  _requisicao: Request,
  { params }: { params: Promise<{ sessaoId: string }> },
) {
  const { sessaoId } = await params;
  const id = Number(sessaoId);
  if (!Number.isInteger(id) || id <= 0) {
    return new Response(null, { status: 422 });
  }

  const baseUrl = process.env.CUPCAM_API_URL?.replace(/\/$/, "");
  const apiKey = process.env.CUPCAM_API_KEY;
  if (!baseUrl || !apiKey) {
    return new Response(null, { status: 500 });
  }

  try {
    const resposta = await fetch(`${baseUrl}/sessoes/${id}/audio`, {
      headers: { "X-API-Key": apiKey, Range: "bytes=0-0" },
      cache: "no-store",
    });
    // Cancela o corpo explicitamente: com o Range ele e' 1 byte (ou o WAV
    // inteiro, se o servidor ignorar o cabecalho), e deixar o stream aberto
    // seguraria a conexao a toa.
    await resposta.body?.cancel();
    // Mesma regra do GET: status cru nunca sobe pro navegador, senao um 401 da
    // chave do SERVIDOR viraria "voce nao esta autenticado" pro professor.
    // 206 (Partial Content) e' o sucesso esperado do Range; 200 tambem serve,
    // pra um servidor que responda o arquivo todo em vez do trecho.
    return new Response(null, {
      status: resposta.ok ? 200 : resposta.status === 404 ? 404 : 502,
    });
  } catch {
    return new Response(null, { status: 502 });
  }
}

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

/**
 * Exclui o audio da aula a pedido do professor.
 *
 * Apaga TODOS os trechos da sessao no backend e NUNCA toca na transcricao — o
 * texto continua na tela depois disso. E' irreversivel, e por isso a tela pede
 * confirmacao antes de chamar aqui.
 */
export async function DELETE(
  _requisicao: Request,
  { params }: { params: Promise<{ sessaoId: string }> },
) {
  const { sessaoId } = await params;
  const id = Number(sessaoId);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ erro: "Sessão inválida." }, { status: 422 });
  }

  try {
    return NextResponse.json(await excluirAudioDaSessao(id));
  } catch (causa) {
    if (causa instanceof ApiError) {
      // Mesma regra do reprocessar: cada status ganha a mensagem do SEU caso.
      // Dizer "não há áudio" quando a sala esta fora do ar mandaria o professor
      // procurar problema no lugar errado.
      const mensagem =
        causa.status === 404
          ? "Este áudio já não está mais guardado."
          : "Não foi possível excluir o áudio. Verifique se o notebook da sala está ligado.";
      return NextResponse.json({ erro: mensagem }, { status: statusSeguro(causa) });
    }
    throw causa;
  }
}
