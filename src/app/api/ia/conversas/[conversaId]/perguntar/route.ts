import { NextResponse } from "next/server";

import { ApiError, perguntarNaConversa } from "@/lib/api";

/**
 * Ponte da pergunta ao Cup AI.
 *
 * Diferente das outras pontes, esta repassa `FormData` cru (multipart) em vez
 * de JSON, porque a pergunta carrega arquivos anexados. O corpo vai inteiro:
 * `pergunta`, `sessao_ids` (IDs de aula separados por virgula) e `anexos`.
 *
 * As aulas viajam como ID, nunca como texto — o conteudo da transcricao e' lido
 * no servidor do CUPCAM. Isso e' regra de privacidade da transcricao, nao um
 * detalhe de implementacao: o texto da fala do professor nao passa pelo
 * navegador.
 */

export const dynamic = "force-dynamic";

/**
 * Mensagem pro professor por status da API do CUPCAM.
 *
 * Nao usa `statusSeguro` de proposito: a allowlist dele (404/409/413/422)
 * derrubaria pra 502 justamente os status que ESTA rota precisa distinguir —
 * 503 (sem chave configurada, que nao e' erro nosso nem falha de rede) e 502
 * do modelo (a pergunta ja' ficou gravada, entao a tela nao pode sugerir que
 * tudo se perdeu). 401/403 continuam virando 502: sao chave errada do servidor.
 */
function traduzirFalha(causa: ApiError): { mensagem: string; status: number } {
  switch (causa.status) {
    case 404:
      return { mensagem: "Esta conversa não existe mais.", status: 404 };
    case 400:
      // Aula anexada sem transcricao pronta. O detalhe da API diz qual.
      return {
        mensagem: "Uma das aulas anexadas não tem transcrição disponível.",
        status: 400,
      };
    case 413:
      return {
        mensagem: "Anexo grande demais. O limite é 20 MB por arquivo.",
        status: 413,
      };
    case 502:
      return {
        mensagem:
          "O assistente não conseguiu responder agora. Sua pergunta foi salva — tente de novo em instantes.",
        status: 502,
      };
    case 503:
      return {
        mensagem:
          "O assistente ainda não está configurado no servidor (falta a chave de API).",
        status: 503,
      };
    default:
      // 504, e nao 502: aqui a requisicao NAO chegou na API do CUPCAM (status 0
      // = notebook desligado, tunel caido), entao a pergunta com certeza nao foi
      // gravada. O 502 acima significa o oposto — a API recebeu, gravou e só
      // então o modelo falhou. A tela usa essa diferenca pra decidir se devolve
      // o texto digitado pro professor: no 504 devolve (nada foi salvo), no 502
      // nao (reenviar gravaria a pergunta duas vezes).
      return {
        mensagem:
          "Não foi possível falar com a API do CUPCAM. Verifique se o notebook da sala está ligado.",
        status: 504,
      };
  }
}

export async function POST(
  requisicao: Request,
  { params }: { params: Promise<{ conversaId: string }> },
) {
  const { conversaId } = await params;
  const id = Number(conversaId);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ erro: "Conversa inválida." }, { status: 422 });
  }

  let corpo: FormData;
  try {
    corpo = await requisicao.formData();
  } catch {
    return NextResponse.json(
      { erro: "Corpo da requisição inválido." },
      { status: 400 },
    );
  }

  const pergunta = corpo.get("pergunta");
  if (typeof pergunta !== "string" || !pergunta.trim()) {
    return NextResponse.json({ erro: "Escreva uma pergunta." }, { status: 400 });
  }

  try {
    return NextResponse.json(await perguntarNaConversa(id, corpo));
  } catch (causa) {
    if (causa instanceof ApiError) {
      const { mensagem, status } = traduzirFalha(causa);
      return NextResponse.json({ erro: mensagem }, { status });
    }
    throw causa;
  }
}
