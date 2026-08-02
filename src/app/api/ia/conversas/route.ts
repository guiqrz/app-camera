import { NextResponse } from "next/server";

import { statusSeguro } from "@/app/api/admin/_lib/status-seguro";
import { ApiError, criarConversa, listarConversas } from "@/lib/api";

/**
 * Ponte das conversas do Cup AI: listar (GET) e comecar uma nova (POST).
 *
 * O navegador chama AQUI, e esta rota, rodando no servidor, repassa pra API do
 * CUPCAM com a X-API-Key. Mesmo motivo das outras pontes: "use client" nao pode
 * importar lib/api.ts (server-only), entao a chave nunca aparece no JavaScript
 * do usuario.
 */

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await listarConversas());
  } catch (causa) {
    if (causa instanceof ApiError) {
      return NextResponse.json(
        {
          erro: "Não foi possível carregar as conversas. Verifique se o notebook da sala está ligado.",
        },
        { status: statusSeguro(causa) },
      );
    }
    throw causa;
  }
}

export async function POST(requisicao: Request) {
  let dados: unknown;
  try {
    dados = await requisicao.json();
  } catch {
    return NextResponse.json(
      { erro: "Corpo da requisição inválido." },
      { status: 400 },
    );
  }

  // A primeira pergunta vira o titulo da conversa, entao vazio nao serve —
  // barra aqui em vez de criar uma conversa "sem nome" no banco.
  const primeiraPergunta =
    typeof dados === "object" &&
    dados !== null &&
    "primeira_pergunta" in dados &&
    typeof (dados as { primeira_pergunta: unknown }).primeira_pergunta === "string"
      ? (dados as { primeira_pergunta: string }).primeira_pergunta.trim()
      : "";

  if (!primeiraPergunta) {
    return NextResponse.json(
      { erro: "Escreva uma pergunta para começar a conversa." },
      { status: 400 },
    );
  }

  try {
    return NextResponse.json(await criarConversa(primeiraPergunta), { status: 201 });
  } catch (causa) {
    if (causa instanceof ApiError) {
      return NextResponse.json(
        { erro: "Não foi possível criar a conversa. Tente novamente em instantes." },
        { status: statusSeguro(causa) },
      );
    }
    throw causa;
  }
}
