import { NextResponse } from "next/server";

import { ApiError, exportarMaterial } from "@/lib/api";

/**
 * Ponte da exportacao do material (.pptx / PDF).
 *
 * Diferente das outras pontes, esta devolve BYTES (o arquivo), nao JSON — o
 * corpo da resposta e' o `Blob` cru vindo de `exportarMaterial`, com o
 * `Content-Type` e o `Content-Disposition` da API repassados sem alteracao
 * (o nome do arquivo ja vem sanitizado de la').
 *
 * So' PowerPoint e PDF passam por aqui. Markdown continua 100% no navegador
 * (ver `acoes-da-resposta.tsx`) — nao ha rota pra ele de proposito.
 */

export const dynamic = "force-dynamic";

/**
 * Mensagem pro professor por status da API do CUPCAM.
 *
 * Igual a' ponte de `perguntar`: nao usa `statusSeguro` porque a allowlist
 * dele nao cobre exatamente os casos que ESTA rota precisa distinguir (400
 * de formato invalido, 413 de material grande demais). 401/403 (chave errada
 * no SERVIDOR) viram 502 — problema de configuracao nosso, nao do professor.
 */
function traduzirFalha(causa: ApiError): { mensagem: string; status: number } {
  switch (causa.status) {
    case 400:
      return {
        mensagem: "Não foi possível gerar o arquivo. Tente de novo.",
        status: 400,
      };
    case 413:
      return {
        mensagem: "Este material é grande demais para exportar.",
        status: 413,
      };
    case 500:
      // Falha de infraestrutura no servidor (ex.: fonte ausente pro PDF) —
      // nao e' nada que o professor causou nem pode corrigir tentando de novo
      // com outro texto.
      return {
        mensagem: "Não foi possível gerar o arquivo agora. Tente de novo em instantes.",
        status: 502,
      };
    default:
      // 401/403 (chave do servidor errada) e qualquer outro status
      // inesperado caem aqui — nunca vaza detalhe de infraestrutura.
      return {
        mensagem: "Não foi possível gerar o arquivo. Tente de novo.",
        status: 502,
      };
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

  if (typeof corpo !== "object" || corpo === null) {
    return NextResponse.json(
      { erro: "Corpo da requisição inválido." },
      { status: 400 },
    );
  }

  const { texto, formato, titulo } = corpo as Record<string, unknown>;

  if (typeof texto !== "string" || !texto.trim()) {
    return NextResponse.json({ erro: "Não há material para exportar." }, { status: 400 });
  }
  if (formato !== "pdf" && formato !== "pptx") {
    return NextResponse.json({ erro: "Formato inválido." }, { status: 400 });
  }

  try {
    const arquivo = await exportarMaterial(
      texto,
      formato,
      typeof titulo === "string" ? titulo : "",
    );
    // NextResponse aceita Blob direto no corpo — os bytes vao pro navegador
    // sem passar por JSON, e os dois headers dizem a ele que arquivo e' esse
    // e qual nome sugerir no download.
    return new NextResponse(arquivo.bytes, {
      status: 200,
      headers: {
        "Content-Type": arquivo.contentType,
        "Content-Disposition": arquivo.contentDisposition,
      },
    });
  } catch (causa) {
    if (causa instanceof ApiError) {
      const { mensagem, status } = traduzirFalha(causa);
      return NextResponse.json({ erro: mensagem }, { status });
    }
    throw causa;
  }
}
