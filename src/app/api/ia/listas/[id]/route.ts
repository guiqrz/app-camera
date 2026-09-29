import { NextResponse } from "next/server";

import { statusSeguro } from "@/app/api/admin/_lib/status-seguro";
import { ApiError, atualizarListaDeExercicios, lerListaDeExercicios } from "@/lib/api";

/**
 * Ponte de uma lista de exercicios do Cup AI: ler (GET) e tirar/reordenar
 * questoes pelo ✕ do cartao (PATCH).
 *
 * Como as outras pontes, roda no servidor e repassa a X-API-Key pra API do
 * CUPCAM — a chave nunca chega ao JavaScript do navegador.
 */

export const dynamic = "force-dynamic";

/** Mesmo teto do backend (MAXIMO_DE_QUESTOES em cupcam/questoes/listas.py). */
const MAXIMO_DE_QUESTOES = 30;

/** Valida o id da rota. Devolve null quando nao e' um inteiro positivo. */
function lerId(bruto: string): number | null {
  const id = Number(bruto);
  return Number.isInteger(id) && id > 0 ? id : null;
}

/** `questaoIds` valido: array de inteiros positivos, ate' o teto. */
function lerQuestaoIds(valor: unknown): number[] | null {
  if (!Array.isArray(valor) || valor.length > MAXIMO_DE_QUESTOES) return null;
  const eInteiroPositivo = (item: unknown) =>
    typeof item === "number" && Number.isInteger(item) && item > 0;
  return valor.every(eInteiroPositivo) ? (valor as number[]) : null;
}

export async function GET(
  _requisicao: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: bruto } = await params;
  const id = lerId(bruto);
  if (id === null) {
    return NextResponse.json({ erro: "Lista inválida." }, { status: 422 });
  }

  try {
    return NextResponse.json(await lerListaDeExercicios(id));
  } catch (causa) {
    if (causa instanceof ApiError) {
      const mensagem = causa.isNotFound
        ? "Esta lista de exercícios não existe mais."
        : "Não foi possível carregar a lista. Tente de novo em instantes.";
      return NextResponse.json({ erro: mensagem }, { status: statusSeguro(causa) });
    }
    throw causa;
  }
}

export async function PATCH(
  requisicao: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: bruto } = await params;
  const id = lerId(bruto);
  if (id === null) {
    return NextResponse.json({ erro: "Lista inválida." }, { status: 422 });
  }

  let corpo: unknown;
  try {
    corpo = await requisicao.json();
  } catch {
    return NextResponse.json({ erro: "Corpo da requisição inválido." }, { status: 400 });
  }
  const questaoIds = lerQuestaoIds(
    typeof corpo === "object" && corpo !== null
      ? (corpo as Record<string, unknown>).questaoIds
      : undefined,
  );
  if (questaoIds === null) {
    return NextResponse.json({ erro: "Lista de questões inválida." }, { status: 422 });
  }

  try {
    return NextResponse.json(await atualizarListaDeExercicios(id, questaoIds));
  } catch (causa) {
    if (causa instanceof ApiError) {
      // 422 do backend = tentou pôr questão nova por aqui. O cartão só tira,
      // então isso só acontece com a lista mudada em outra aba.
      const mensagem = causa.isNotFound
        ? "Esta lista de exercícios não existe mais."
        : causa.status === 422
          ? "A lista mudou em outra aba. Recarregue a página."
          : "Não foi possível salvar a lista. Tente de novo em instantes.";
      return NextResponse.json({ erro: mensagem }, { status: statusSeguro(causa) });
    }
    throw causa;
  }
}
