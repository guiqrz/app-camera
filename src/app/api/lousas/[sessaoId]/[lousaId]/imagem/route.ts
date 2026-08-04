import { NextResponse } from "next/server";

/**
 * Ponte da foto do quadro. O <img> do navegador aponta para AQUI; esta rota,
 * no servidor, busca a imagem na API do CUPCAM com a X-API-Key e repassa os
 * bytes. A chave nunca chega ao navegador — mesmo motivo das outras pontes.
 *
 * Nao usa lib/api.ts porque aquele cliente sempre faz `.json()`; aqui o corpo
 * e' binario (image/jpeg), entao o fetch e o repasse vivem neste handler.
 * Mesmo desenho de admin/alunos/[ra]/foto.
 *
 * A sessao vai na URL e e' conferida pelo backend: sem isso, a rota viraria um
 * jeito de varrer todas as imagens do banco por id sequencial.
 */

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ sessaoId: string; lousaId: string }> };

export async function GET(_requisicao: Request, { params }: Params) {
  const { sessaoId, lousaId } = await params;

  const sessao = Number(sessaoId);
  const lousa = Number(lousaId);
  if (
    !Number.isInteger(sessao) ||
    sessao <= 0 ||
    !Number.isInteger(lousa) ||
    lousa <= 0
  ) {
    return NextResponse.json({ erro: "Quadro inválido." }, { status: 400 });
  }

  const baseUrl = process.env.CUPCAM_API_URL?.replace(/\/$/, "");
  const apiKey = process.env.CUPCAM_API_KEY;
  if (!baseUrl || !apiKey) {
    return NextResponse.json({ erro: "API não configurada." }, { status: 500 });
  }

  let resposta: Response;
  try {
    resposta = await fetch(`${baseUrl}/sessoes/${sessao}/lousas/${lousa}/imagem`, {
      headers: { "X-API-Key": apiKey },
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ erro: "Falha ao falar com a API." }, { status: 502 });
  }

  // 404 e' esperado quando o quadro expirou (60 dias) ou nao e' dessa aula:
  // repassa pro <img> cair no onError e a tela mostrar o aviso, em vez de
  // tratar como erro de servidor.
  if (resposta.status === 404) {
    return NextResponse.json({ erro: "Quadro não encontrado." }, { status: 404 });
  }
  if (!resposta.ok) {
    return NextResponse.json({ erro: "Falha ao buscar o quadro." }, { status: 502 });
  }

  const bytes = await resposta.arrayBuffer();
  return new NextResponse(bytes, {
    status: 200,
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": "private, max-age=30",
    },
  });
}
