import { NextResponse } from "next/server";

import { statusSeguro } from "@/app/api/admin/_lib/status-seguro";
import { ApiError, confirmarPresenca } from "@/lib/api";

/**
 * Ponte de escrita da tela "Fazer Chamada".
 *
 * O navegador chama AQUI (POST /api/chamada/{sessaoId}/{ra}), e esta rota,
 * rodando no servidor, repassa para a API do CUPCAM com a X-API-Key. E' o
 * unico caminho: componentes "use client" nao podem importar lib/api.ts
 * (server-only), entao a chave nunca aparece no JavaScript do usuario.
 */

type Params = {
  params: Promise<{ sessaoId: string; ra: string }>;
};

export async function POST(requisicao: Request, { params }: Params) {
  const { sessaoId, ra } = await params;

  const id = Number(sessaoId);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json(
      { erro: "Sessão inválida." },
      { status: 400 },
    );
  }

  // O RA vem da URL; recusa vazio antes de bater na API.
  if (!ra.trim()) {
    return NextResponse.json({ erro: "RA inválido." }, { status: 400 });
  }

  // Corpo esperado: { presente: boolean }. Qualquer outra coisa e' 400.
  let presente: unknown;
  try {
    ({ presente } = await requisicao.json());
  } catch {
    return NextResponse.json(
      { erro: "Corpo da requisição inválido." },
      { status: 400 },
    );
  }
  if (typeof presente !== "boolean") {
    return NextResponse.json(
      { erro: "Campo 'presente' deve ser true ou false." },
      { status: 400 },
    );
  }

  try {
    const resposta = await confirmarPresenca(id, ra, presente);
    return NextResponse.json(resposta);
  } catch (causa) {
    if (causa instanceof ApiError) {
      if (causa.isNotFound) {
        return NextResponse.json(
          { erro: "Aula ou aluno não encontrado." },
          { status: 404 },
        );
      }
      // statusSeguro: 401/403 (nossa CUPCAM_API_KEY errada) e 0 (rede fora do
      // ar) viram 502 — repassar cru faria o navegador achar que o usuario nao
      // esta autenticado, quando ele nem tem sessao com a API do CUPCAM.
      return NextResponse.json(
        { erro: "Não foi possível falar com a API do CUPCAM." },
        { status: statusSeguro(causa) },
      );
    }
    throw causa;
  }
}
