import { NextResponse } from "next/server";

import { ApiError, baixarArquivoDoRoteiro } from "@/lib/api";

/**
 * Ponte do download do roteiro da aula em PDF ou Word.
 *
 * Devolve BYTES, como a ponte da lista: `Content-Type` e `Content-Disposition`
 * da API vao sem alteracao (o nome ja' vem sanitizado de la'). O arquivo e'
 * montado pelo backend a partir dos campos salvos, nunca do texto da conversa.
 */

export const dynamic = "force-dynamic";

/** Allowlist espelhando o backend: nada do cliente vai cru pra API. */
const FORMATOS = ["pdf", "docx"] as const;

type Formato = (typeof FORMATOS)[number];

function eFormato(valor: string | null): valor is Formato {
  return valor !== null && (FORMATOS as readonly string[]).includes(valor);
}

export async function GET(
  requisicao: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: bruto } = await params;
  const id = Number(bruto);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ erro: "Plano inválido." }, { status: 422 });
  }

  const formato = new URL(requisicao.url).searchParams.get("formato");
  if (!eFormato(formato)) {
    return NextResponse.json({ erro: "Formato inválido." }, { status: 400 });
  }

  try {
    const arquivo = await baixarArquivoDoRoteiro(id, formato);
    return new NextResponse(arquivo.bytes, {
      status: 200,
      headers: {
        "Content-Type": arquivo.contentType,
        "Content-Disposition": arquivo.contentDisposition,
      },
    });
  } catch (causa) {
    if (causa instanceof ApiError) {
      if (causa.status === 404) {
        return NextResponse.json({ erro: "Este roteiro não existe mais. Gere de novo." }, { status: 404 });
      }
      // 401/403/5xx: problema nosso, sem detalhe de infra.
      return NextResponse.json(
        { erro: "Não foi possível gerar o arquivo agora. Tente de novo em instantes." },
        { status: 502 },
      );
    }
    throw causa;
  }
}
