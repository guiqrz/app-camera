import { NextResponse } from "next/server";

import { statusSeguro } from "@/app/api/admin/_lib/status-seguro";
import { ApiError, salvarLinkDaAula } from "@/lib/api";

type Props = { params: Promise<{ id: string }> };

/**
 * Ponte do material da aula quando ele e' um LINK, e nao um arquivo.
 *
 * Rota separada do /anexo de proposito: aquela recebe multipart e esta recebe
 * JSON. Juntar as duas obrigaria a tela a montar um FormData pra mandar uma
 * string.
 *
 * PUT substitui: e' UM material por aula (indice unico em aula_id), entao
 * mandar um link troca o arquivo que estava la', e vice-versa.
 */
export async function PUT(requisicao: Request, { params }: Props) {
  const { id } = await params;
  const aulaId = Number(id);
  if (!Number.isInteger(aulaId) || aulaId <= 0) {
    return NextResponse.json({ erro: "Aula inválida." }, { status: 400 });
  }

  let corpo: { url?: unknown; nome?: unknown };
  try {
    corpo = await requisicao.json();
  } catch {
    return NextResponse.json(
      { erro: "Corpo da requisição inválido." },
      { status: 400 },
    );
  }

  if (typeof corpo.url !== "string") {
    return NextResponse.json({ erro: "Link inválido." }, { status: 400 });
  }
  const nome = typeof corpo.nome === "string" ? corpo.nome : "";

  try {
    return NextResponse.json(await salvarLinkDaAula(aulaId, corpo.url, nome));
  } catch (causa) {
    if (causa instanceof ApiError) {
      if (causa.isNotFound) {
        return NextResponse.json(
          { erro: "Aula não encontrada." },
          { status: 404 },
        );
      }
      if (causa.status === 422) {
        // A mensagem da API diz POR QUE o link nao serve (esquema, tamanho), e
        // e' ela que ajuda o professor a corrigir — nao um "invalido" generico.
        return NextResponse.json(
          {
            erro:
              typeof causa.detalhe === "string"
                ? causa.detalhe
                : "O link precisa começar com http:// ou https://",
          },
          { status: 422 },
        );
      }
      return NextResponse.json(
        { erro: "Não foi possível salvar o link." },
        { status: statusSeguro(causa) },
      );
    }
    throw causa;
  }
}
