import { NextResponse } from "next/server";

import { lerDataDoEncontro } from "@/app/api/admin/_lib/data-do-encontro";
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
 * Ponte do anexo do ENCONTRO (o material que o professor pendura na agenda).
 *
 * PUT substitui: o indice unico em (aula_id, data) permite UM anexo por
 * ENCONTRO, entao enviar outro NO MESMO DIA troca o que estava la'. Um dia
 * diferente nao e' tocado. `?data=AAAA-MM-DD` escolhe o encontro; sem ela, a
 * semana corrente.
 */
export async function PUT(requisicao: Request, { params }: Props) {
  const aulaId = await lerAulaId(params);
  if (aulaId === null) {
    return NextResponse.json({ erro: "Aula inválida." }, { status: 400 });
  }

  const encontro = lerDataDoEncontro(requisicao);
  if (!encontro.ok) {
    return NextResponse.json({ erro: encontro.erro }, { status: 422 });
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
    return NextResponse.json(
      await salvarAnexoDaAula(aulaId, form, encontro.data),
    );
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
 * `?inline=1` e' REPASSADO pro backend: com ele, a API responde
 * `Content-Disposition: inline` pros tipos que o navegador renderiza sem risco
 * (PDF, imagem raster) e o professor VE o material numa aba, em vez de baixar.
 * Sem o parametro, ou pra tipo perigoso (HTML, SVG), a API mantem `attachment`
 * — o que impede o navegador de RENDERIZAR upload no nosso dominio.
 *
 * O Content-Disposition da resposta vem da API ja sanitizado (aspas, CRLF e
 * ".." mortos — ver _nome_do_anexo em web/api.py) e e' repassado como veio.
 */
export async function GET(requisicao: Request, { params }: Props) {
  const aulaId = await lerAulaId(params);
  if (aulaId === null) {
    return NextResponse.json({ erro: "Aula inválida." }, { status: 400 });
  }

  const encontro = lerDataDoEncontro(requisicao);
  if (!encontro.ok) {
    return NextResponse.json({ erro: encontro.erro }, { status: 422 });
  }

  const { baseUrl, apiKey } = lerConfiguracao();

  // So' `inline` e `data` atravessam: sao os unicos parametros que a rota do
  // backend conhece, e repassar a query inteira levaria lixo do cliente pra API.
  const parametros = new URLSearchParams();
  if (new URL(requisicao.url).searchParams.get("inline") === "1") {
    parametros.set("inline", "1");
  }
  if (encontro.data) parametros.set("data", encontro.data);
  const query = parametros.size > 0 ? `?${parametros}` : "";

  let resposta: Response;
  try {
    resposta = await fetch(`${baseUrl}/admin/aulas/${aulaId}/anexo${query}`, {
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

export async function DELETE(requisicao: Request, { params }: Props) {
  const aulaId = await lerAulaId(params);
  if (aulaId === null) {
    return NextResponse.json({ erro: "Aula inválida." }, { status: 400 });
  }

  const encontro = lerDataDoEncontro(requisicao);
  if (!encontro.ok) {
    return NextResponse.json({ erro: encontro.erro }, { status: 422 });
  }

  try {
    return NextResponse.json(await removerAnexoDaAula(aulaId, encontro.data));
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
