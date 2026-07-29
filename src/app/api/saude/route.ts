import { NextResponse } from "next/server";

import { ApiError, listarTurmas } from "@/lib/api";

/**
 * Ponte de diagnostico da tela "Configuracoes".
 *
 * Responde se a API do CUPCAM esta no ar e quanto tempo levou pra responder.
 * O navegador chama AQUI porque a X-API-Key vive no servidor — o mesmo motivo
 * das outras pontes em /api.
 *
 * Usa GET /turmas como sonda em vez de um endpoint dedicado: e' a rota mais
 * barata que ja existe e que exerce o caminho completo (rede + chave + banco).
 * Um /health que so' devolvesse "ok" responderia bem com o banco quebrado.
 */

export const dynamic = "force-dynamic";

/** Endereco da API sem credencial — so' host e porta, pra mostrar na tela. */
function enderecoVisivel(): string {
  const bruto = process.env.CUPCAM_API_URL;
  if (!bruto) return "não configurado";

  try {
    const url = new URL(bruto);
    // Só host+porta: o resto do endereco pode carregar caminho ou query que
    // nao interessam na tela e aumentariam a superficie de vazamento.
    return url.host;
  } catch {
    return "endereço inválido";
  }
}

export async function GET() {
  const endereco = enderecoVisivel();
  const comeco = Date.now();

  try {
    await listarTurmas();
    return NextResponse.json({
      online: true,
      latenciaMs: Date.now() - comeco,
      endereco,
    });
  } catch (causa) {
    if (causa instanceof ApiError) {
      // 200 de proposito: a sonda FUNCIONOU e a resposta dela e' "a API esta
      // fora". Devolver erro HTTP aqui faria a tela tratar um diagnostico
      // bem-sucedido como falha de diagnostico.
      return NextResponse.json({
        online: false,
        latenciaMs: Date.now() - comeco,
        endereco,
        // Status cru so' pra distinguir "rede fora" (0) de "API respondeu
        // errado" — nunca o corpo do erro, que pode trazer detalhe interno.
        motivo: causa.status === 0 ? "sem-resposta" : "erro-api",
      });
    }
    throw causa;
  }
}
