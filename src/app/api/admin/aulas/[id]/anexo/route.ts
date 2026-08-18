import { NextResponse } from "next/server";

import { statusSeguro } from "@/app/api/admin/_lib/status-seguro";
import {
  ApiError,
  lerConfiguracao,
  removerAnexoDaAula,
  salvarAnexoDaAula,
} from "@/lib/api";

type Props = { params: Promise<{ id: string }> };

async function lerAulaId(params: Props["params"]) {
  const { id } = await params;
  const numero = Number(id);
  return Number.isInteger(numero) && numero > 0 ? numero : null;
}

/**
 * Ponte do anexo da aula (o material que o professor pendura na agenda).
 *
 * PUT substitui: o indice unico em aula_id permite UM anexo por aula, entao
 * enviar outro troca o que estava la'.
 */
export async function PUT(requisicao: Request, { params }: Props) {
  const aulaId = await lerAulaId(params);
  if (aulaId === null) {
    return NextResponse.json({ erro: "Aula inválida." }, { status: 400 });
  }

  let form: FormData;
  try {
    form = await requisicao.formData();
  } catch {
    return NextResponse.json(
      { erro: "Corpo da requisição inválido." },
      { status: 400 },
    );
  }

  try {
    return NextResponse.json(await salvarAnexoDaAula(aulaId, form));
  } catch (causa) {
    if (causa instanceof ApiError) {
      if (causa.isNotFound) {
        return NextResponse.json(
          { erro: "Aula não encontrada." },
          { status: 404 },
        );
      }
      if (causa.status === 422) {
        return NextResponse.json(
          { erro: "Arquivo inválido.", detalhe: causa.detalhe },
          { status: 422 },
        );
      }
      if (causa.status === 413) {
        return NextResponse.json(
          { erro: "Arquivo grande demais." },
          { status: 413 },
        );
      }
      return NextResponse.json(
        { erro: "Não foi possível enviar o anexo." },
        { status: statusSeguro(causa) },
      );
    }
    throw causa;
  }
}

/**
 * Baixa o anexo. Repassa os BYTES, nao JSON — por isso nao usa `requisitar`,
 * que faz `.json()` da resposta e engasgaria num PDF.
 *
 * O Content-Disposition vem da API ja sanitizado (aspas, CRLF e ".." mortos —
 * ver _nome_do_anexo em web/api.py). Ele e' repassado como veio, e o
 * `attachment` que ele carrega e' o que impede o navegador de RENDERIZAR um
 * HTML/SVG vindo de upload no nosso dominio.
 */
export async function GET(_requisicao: Request, { params }: Props) {
  const aulaId = await lerAulaId(params);
  if (aulaId === null) {
    return NextResponse.json({ erro: "Aula inválida." }, { status: 400 });
  }

  const { baseUrl, apiKey } = lerConfiguracao();

  let resposta: Response;
  try {
    resposta = await fetch(`${baseUrl}/admin/aulas/${aulaId}/anexo`, {
      headers: { "X-API-Key": apiKey },
      cache: "no-store",
    });
  } catch {
    return NextResponse.json(
      { erro: "Não foi possível falar com a API do CUPCAM." },
      { status: 502 },
    );
  }

  if (resposta.status === 404) {
    return NextResponse.json({ erro: "Aula sem anexo." }, { status: 404 });
  }
  if (!resposta.ok) {
    return NextResponse.json(
      { erro: "Não foi possível baixar o anexo." },
      { status: 502 },
    );
  }

  const disposicao = resposta.headers.get("content-disposition");
  return new NextResponse(resposta.body, {
    headers: {
      "Content-Type":
        resposta.headers.get("content-type") ?? "application/octet-stream",
      ...(disposicao ? { "Content-Disposition": disposicao } : {}),
      // Anexo e' material do professor: nunca em cache compartilhado.
      "Cache-Control": "private, no-store",
    },
  });
}

export async function DELETE(_requisicao: Request, { params }: Props) {
  const aulaId = await lerAulaId(params);
  if (aulaId === null) {
    return NextResponse.json({ erro: "Aula inválida." }, { status: 400 });
  }

  try {
    return NextResponse.json(await removerAnexoDaAula(aulaId));
  } catch (causa) {
    if (causa instanceof ApiError) {
      if (causa.isNotFound) {
        return NextResponse.json(
          { erro: "Aula sem anexo." },
          { status: 404 },
        );
      }
      return NextResponse.json(
        { erro: "Não foi possível remover o anexo." },
        { status: statusSeguro(causa) },
      );
    }
    throw causa;
  }
}
