import { NextResponse } from "next/server";

import { ApiError, sugerirProximaAula } from "@/lib/api";

/**
 * Ponte da sugestao da proxima aula (feature F11).
 *
 * Existe pelo mesmo motivo das outras pontes: a chave da API do CUPCAM fica no
 * servidor e nunca chega ao navegador (ver o cabecalho de lib/api.ts).
 *
 * POR QUE ESTA E' POST E POR QUE E' SOB DEMANDA
 * ---------------------------------------------
 * A rota GASTA uma chamada de IA. Se a pagina de "Minhas aulas" a buscasse no
 * servidor junto do resto, TODA abertura da tela — inclusive as dezenas de
 * vezes por dia em que o professor so' quer ver a lista de aulas — pagaria uma
 * geracao de texto que ele nao pediu.
 *
 * Por isso a tela carrega so' o alerta de atraso (F10, que e' consulta ao
 * banco e barata) e busca a sugestao daqui quando o professor clicar.
 */

export const dynamic = "force-dynamic";

function traduzirFalha(causa: ApiError): { mensagem: string; status: number } {
  switch (causa.status) {
    case 404:
      return { mensagem: "Turma não encontrada.", status: 404 };
    case 502:
      // A API respondeu, mas o modelo falhou. Mensagem propria: e' o unico
      // caso em que tentar de novo daqui a pouco costuma resolver.
      return {
        mensagem:
          "A Cup AI não conseguiu gerar a sugestão agora. Tente de novo em instantes.",
        status: 502,
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

export async function POST(
  _requisicao: Request,
  { params }: { params: Promise<{ turmaId: string }> },
) {
  const { turmaId } = await params;
  const id = Number(turmaId);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ erro: "Turma inválida." }, { status: 422 });
  }

  try {
    return NextResponse.json(await sugerirProximaAula(id));
  } catch (causa) {
    if (causa instanceof ApiError) {
      const { mensagem, status } = traduzirFalha(causa);
      return NextResponse.json({ erro: mensagem }, { status });
    }
    throw causa;
  }
}
