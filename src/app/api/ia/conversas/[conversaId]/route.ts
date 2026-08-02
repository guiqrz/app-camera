import { NextResponse } from "next/server";

import { statusSeguro } from "@/app/api/admin/_lib/status-seguro";
import { ApiError, apagarConversa, buscarConversa } from "@/lib/api";

/**
 * Ponte de uma conversa do Cup AI: ler com as mensagens (GET) e apagar (DELETE).
 *
 * Como as outras pontes, roda no servidor e repassa a X-API-Key pra API do
 * CUPCAM — a chave nunca chega ao JavaScript do navegador.
 */

export const dynamic = "force-dynamic";

/** Valida o id da rota. Devolve null quando nao e' um inteiro positivo. */
function lerId(bruto: string): number | null {
  const id = Number(bruto);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function GET(
  _requisicao: Request,
  { params }: { params: Promise<{ conversaId: string }> },
) {
  const { conversaId } = await params;
  const id = lerId(conversaId);
  if (id === null) {
    return NextResponse.json({ erro: "Conversa inválida." }, { status: 422 });
  }

  try {
    return NextResponse.json(await buscarConversa(id));
  } catch (causa) {
    if (causa instanceof ApiError) {
      // 404 aqui e' um caso REAL de tela: a conversa foi apagada em outra aba
      // ou o professor abriu um link velho. Quem chama mostra "não encontrada".
      const mensagem = causa.isNotFound
        ? "Esta conversa não existe mais."
        : "Não foi possível carregar a conversa. Verifique se o notebook da sala está ligado.";
      return NextResponse.json({ erro: mensagem }, { status: statusSeguro(causa) });
    }
    throw causa;
  }
}

export async function DELETE(
  _requisicao: Request,
  { params }: { params: Promise<{ conversaId: string }> },
) {
  const { conversaId } = await params;
  const id = lerId(conversaId);
  if (id === null) {
    return NextResponse.json({ erro: "Conversa inválida." }, { status: 422 });
  }

  try {
    return NextResponse.json(await apagarConversa(id));
  } catch (causa) {
    if (causa instanceof ApiError) {
      // Conversa ja' apagada: o resultado que o professor queria ja' vale.
      // Ainda assim devolve 404 pra tela distinguir "sumiu" de "deu erro".
      const mensagem = causa.isNotFound
        ? "Esta conversa já foi apagada."
        : "Não foi possível apagar a conversa. Tente novamente em instantes.";
      return NextResponse.json({ erro: mensagem }, { status: statusSeguro(causa) });
    }
    throw causa;
  }
}
