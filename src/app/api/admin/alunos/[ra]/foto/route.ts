import { NextResponse } from "next/server";

/**
 * Ponte da miniatura do aluno. O navegador aponta um <img> para AQUI; esta
 * rota (no servidor) busca a imagem na API do CUPCAM com a X-API-Key e repassa
 * os bytes. A chave nunca chega ao navegador — mesmo motivo das outras pontes.
 *
 * Nao usa lib/api.ts porque aquele cliente sempre faz `.json()`; aqui o corpo
 * e' binario (image/jpeg), entao o fetch e o repasse dos bytes vivem direto
 * neste handler.
 */
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ ra: string }> };

export async function GET(_requisicao: Request, { params }: Params) {
  const { ra } = await params;

  const baseUrl = process.env.CUPCAM_API_URL?.replace(/\/$/, "");
  const apiKey = process.env.CUPCAM_API_KEY;
  if (!baseUrl || !apiKey) {
    return NextResponse.json({ erro: "API não configurada." }, { status: 500 });
  }

  let resposta: Response;
  try {
    resposta = await fetch(
      `${baseUrl}/admin/alunos/${encodeURIComponent(ra)}/foto`,
      { headers: { "X-API-Key": apiKey }, cache: "no-store" },
    );
  } catch {
    return NextResponse.json({ erro: "Falha ao falar com a API." }, { status: 502 });
  }

  // 404 e' esperado (aluno sem foto): repassa pra o <img> cair no onError e
  // mostrar o avatar de iniciais, sem tratar como erro real.
  if (resposta.status === 404) {
    return NextResponse.json({ erro: "Sem foto." }, { status: 404 });
  }
  if (!resposta.ok) {
    return NextResponse.json({ erro: "Falha ao buscar a foto." }, { status: 502 });
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
