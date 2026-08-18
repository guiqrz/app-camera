import { NextResponse } from "next/server";

import { statusSeguro } from "@/app/api/admin/_lib/status-seguro";
import { ApiError, criarLembrete, listarLembretes } from "@/lib/api";

/**
 * Ponte dos lembretes da tela "Minhas Aulas".
 *
 * O navegador chama AQUI, e esta rota, rodando no servidor, repassa pra API do
 * CUPCAM com a X-API-Key — "use client" nao pode importar lib/api.ts
 * (server-only), senao a chave iria embutida no JavaScript do usuario.
 */

export async function GET() {
  try {
    return NextResponse.json(await listarLembretes());
  } catch (causa) {
    if (causa instanceof ApiError) {
      return NextResponse.json(
        { erro: "Não foi possível carregar os lembretes." },
        { status: statusSeguro(causa) },
      );
    }
    throw causa;
  }
}

export async function POST(requisicao: Request) {
  let corpo: unknown;
  try {
    corpo = await requisicao.json();
  } catch {
    return NextResponse.json(
      { erro: "Corpo da requisição inválido." },
      { status: 400 },
    );
  }

  const { texto, data } = (corpo ?? {}) as { texto?: unknown; data?: unknown };

  // Barra o vazio aqui em vez de deixar ir e voltar 422: e' o erro mais comum
  // (Enter num campo em branco) e nao precisa de uma ida a rede pra ser dito.
  if (typeof texto !== "string" || !texto.trim()) {
    return NextResponse.json(
      { erro: "Escreva o lembrete antes de salvar." },
      { status: 422 },
    );
  }

  try {
    const criado = await criarLembrete({
      texto,
      // Campo de data em branco chega como "" e significa "sem prazo".
      data: typeof data === "string" && data ? data : null,
    });
    return NextResponse.json(criado, { status: 201 });
  } catch (causa) {
    if (causa instanceof ApiError) {
      if (causa.status === 422) {
        return NextResponse.json(
          { erro: "Lembrete inválido.", detalhe: causa.detalhe },
          { status: 422 },
        );
      }
      return NextResponse.json(
        { erro: "Não foi possível salvar o lembrete." },
        { status: statusSeguro(causa) },
      );
    }
    throw causa;
  }
}
