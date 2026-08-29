import { NextResponse } from "next/server";

import { ApiError, excluirFichaDoAluno, salvarFichaDoAluno } from "@/lib/api";
import type { TipoDeApoio } from "@/lib/types";

/**
 * Ponte da ficha de apoio do aluno (feature F8).
 *
 * Existe pelo mesmo motivo das outras pontes: a chave da API do CUPCAM fica no
 * servidor e nunca chega ao navegador (ver o cabecalho de lib/api.ts).
 *
 * ISTO E' DADO PESSOAL SENSIVEL — LGPD art. 5o, II, categoria acima do dado
 * comum. Os limites, que estao na spec e nao sao negociaveis:
 *
 *   - ve: professor da turma + coordenacao. So'.
 *   - nunca no diario de classe, nunca na transcricao publicada.
 *   - NUNCA cruzado com engajamento.
 *
 * O ultimo e' o que mais importa aqui: "aluno TEA teve 40% de atencao" e'
 * exatamente o uso que o PRODUCT.md (linha 123) proibe. Por isso esta ponte
 * NAO tem, e nao pode ganhar, nenhum caminho que junte ficha com dado de
 * comportamento.
 *
 * O DELETE e' rota propria, separada do PUT com campos vazios, porque a
 * intencao e o direito sao outros: aqui e' o titular (ou o responsavel)
 * exercendo o direito de eliminacao do art. 18 da LGPD, e um caminho explicito
 * e' mais facil de auditar.
 */

export const dynamic = "force-dynamic";

/** Tipos aceitos. Lista fechada — o backend recusa qualquer outro com 422. */
const TIPOS_VALIDOS: readonly TipoDeApoio[] = [
  "tdah",
  "tea",
  "dislexia",
  "discalculia",
  "deficiencia_visual",
  "deficiencia_auditiva",
  "deficiencia_fisica",
  "altas_habilidades",
  "outro",
];

function traduzirFalha(causa: ApiError): { mensagem: string; status: number } {
  switch (causa.status) {
    case 404:
      return { mensagem: "Aluno não encontrado.", status: 404 };
    case 422:
      return {
        mensagem:
          typeof causa.detalhe === "object" &&
          causa.detalhe !== null &&
          "detail" in causa.detalhe &&
          typeof (causa.detalhe as { detail: unknown }).detail === "string"
            ? ((causa.detalhe as { detail: string }).detail as string)
            : "Dados da ficha inválidos.",
        status: 422,
      };
    default:
      // 504 e nao 502: a requisicao nao chegou na API do CUPCAM. Mesma
      // distincao das outras pontes.
      return {
        mensagem: "Não foi possível falar com a API do CUPCAM.",
        status: 504,
      };
  }
}

export async function PUT(
  requisicao: Request,
  { params }: { params: Promise<{ ra: string }> },
) {
  const { ra } = await params;
  if (!ra) {
    return NextResponse.json({ erro: "Aluno inválido." }, { status: 422 });
  }

  const corpo = (await requisicao.json()) as {
    tipos_de_apoio?: unknown;
    descricao?: unknown;
    adaptacoes?: unknown;
  };

  const tipos = Array.isArray(corpo.tipos_de_apoio)
    ? corpo.tipos_de_apoio.filter((tipo): tipo is TipoDeApoio =>
        TIPOS_VALIDOS.includes(tipo as TipoDeApoio),
      )
    : [];

  const adaptacoes =
    typeof corpo.adaptacoes === "string" ? corpo.adaptacoes.trim() : "";
  const descricao =
    typeof corpo.descricao === "string" ? corpo.descricao.trim() : "";

  try {
    // Os TRES campos vazios APAGAM a ficha, e isso e' de proposito: o professor
    // que limpa tudo esta dizendo "este aluno nao precisa de ficha", e guardar
    // a linha vazia deixaria rastro de que um dia precisou.
    return NextResponse.json(
      await salvarFichaDoAluno(ra, {
        tipos_de_apoio: tipos,
        descricao,
        adaptacoes,
      }),
    );
  } catch (causa) {
    if (causa instanceof ApiError) {
      const { mensagem, status } = traduzirFalha(causa);
      return NextResponse.json({ erro: mensagem }, { status });
    }
    throw causa;
  }
}

export async function DELETE(
  _requisicao: Request,
  { params }: { params: Promise<{ ra: string }> },
) {
  const { ra } = await params;
  if (!ra) {
    return NextResponse.json({ erro: "Aluno inválido." }, { status: 422 });
  }

  try {
    await excluirFichaDoAluno(ra);
    return new NextResponse(null, { status: 204 });
  } catch (causa) {
    if (causa instanceof ApiError) {
      const { mensagem, status } = traduzirFalha(causa);
      return NextResponse.json({ erro: mensagem }, { status });
    }
    throw causa;
  }
}
