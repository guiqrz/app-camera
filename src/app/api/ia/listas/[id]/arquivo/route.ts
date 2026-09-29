import { NextResponse } from "next/server";

import { ApiError, baixarArquivoDaLista } from "@/lib/api";

/**
 * Ponte do download da Lista ou do Gabarito, em PDF ou Word.
 *
 * Devolve BYTES, como a ponte de /api/ia/exportar: o `Content-Type` e o
 * `Content-Disposition` da API vao sem alteracao (o nome do arquivo ja' vem
 * sanitizado de la'). O arquivo e' montado pelo backend a partir do banco de
 * questoes — nada do texto da conversa passa por aqui.
 */

export const dynamic = "force-dynamic";

/** Allowlists espelhando o backend: nada do cliente vai cru pra API. */
const FORMATOS = ["pdf", "docx"] as const;
const PARTES = ["lista", "gabarito"] as const;

type Formato = (typeof FORMATOS)[number];
type Parte = (typeof PARTES)[number];

function eFormato(valor: string | null): valor is Formato {
  return valor !== null && (FORMATOS as readonly string[]).includes(valor);
}

function eParte(valor: string | null): valor is Parte {
  return valor !== null && (PARTES as readonly string[]).includes(valor);
}

export async function GET(
  requisicao: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: bruto } = await params;
  const id = Number(bruto);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ erro: "Lista inválida." }, { status: 422 });
  }

  const consulta = new URL(requisicao.url).searchParams;
  const formato = consulta.get("formato");
  const parte = consulta.get("parte");
  if (!eFormato(formato) || !eParte(parte)) {
    return NextResponse.json({ erro: "Formato inválido." }, { status: 400 });
  }

  try {
    const arquivo = await baixarArquivoDaLista(id, formato, parte);
    return new NextResponse(arquivo.bytes, {
      status: 200,
      headers: {
        "Content-Type": arquivo.contentType,
        "Content-Disposition": arquivo.contentDisposition,
      },
    });
  } catch (causa) {
    if (causa instanceof ApiError) {
      // 404: a lista foi apagada. 400: lista vazia (o cartão esconde os
      // botões nesse caso, então só chega aqui com a aba desatualizada).
      // 401/403/5xx: problema nosso — nunca vaza detalhe de infraestrutura.
      if (causa.status === 404) {
        return NextResponse.json(
          { erro: "Esta lista de exercícios não existe mais." },
          { status: 404 },
        );
      }
      if (causa.status === 400) {
        return NextResponse.json(
          { erro: "A lista está vazia. Peça ao Cup AI novas questões." },
          { status: 400 },
        );
      }
      return NextResponse.json(
        { erro: "Não foi possível gerar o arquivo agora. Tente de novo em instantes." },
        { status: 502 },
      );
    }
    throw causa;
  }
}
