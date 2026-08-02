import { notFound } from "next/navigation";

import { VistaChat } from "@/components/ia/vista-chat";
import { AppShell } from "@/components/layout/app-shell";
import { Breadcrumb, type EloBreadcrumb } from "@/components/layout/breadcrumb";
import { ApiError, buscarConversa, buscarTranscricao } from "@/lib/api";
import { dataDoTimestamp, formatarDataCurta } from "@/lib/format";
import type { Anexo } from "@/lib/types";

type Props = {
  params: Promise<{ conversaId: string }>;
  searchParams: Promise<{
    /** Texto que criou a conversa e ainda nao foi enviado. */
    pergunta?: string;
    /** Aula trazida do relatorio, pra ja' entrar anexada. */
    sessao?: string;
  }>;
};

/**
 * Monta o anexo da aula trazida do relatorio.
 *
 * Devolve undefined quando o id nao presta, a aula nao tem transcricao ou ela
 * nao esta pronta: nesses casos a conversa abre SEM anexo, em vez de anexar uma
 * transcricao vazia ou pela metade e o modelo responder sobre uma aula que nao
 * leu. O professor ainda pode anexar a aula na mao pelo seletor.
 */
async function montarAnexoDaAula(bruto: string | undefined): Promise<Anexo | undefined> {
  if (!bruto) return undefined;

  const sessaoId = Number(bruto);
  if (!Number.isInteger(sessaoId) || sessaoId <= 0) return undefined;

  const transcricao = await buscarTranscricao(sessaoId).catch(() => null);
  if (transcricao === null || transcricao.estado !== "pronta") return undefined;

  const data = formatarDataCurta(dataDoTimestamp(transcricao.data));
  return {
    tipo: "aula",
    sessaoId,
    rotulo: transcricao.materia
      ? `Aula ${data} · ${transcricao.materia}`
      : `Aula ${data}`,
    caracteres: transcricao.texto.length,
  };
}

export async function generateMetadata({ params }: Props) {
  const { conversaId } = await params;
  const id = Number(conversaId);
  if (!Number.isInteger(id) || id <= 0) return { title: "Cup AI" };

  const conversa = await buscarConversa(id).catch(() => null);
  if (!conversa) return { title: "Cup AI" };

  return { title: `${conversa.titulo} — Cup AI` };
}

export default async function ConversaPage({ params, searchParams }: Props) {
  const { conversaId } = await params;
  const { pergunta, sessao } = await searchParams;
  const id = Number(conversaId);

  if (!Number.isInteger(id) || id <= 0) notFound();

  const [conversa, anexoInicial] = await Promise.all([
    buscarConversa(id).catch((causa) => {
      // Conversa apagada em outra aba, ou link velho: 404, nao erro de servidor.
      if (causa instanceof ApiError && causa.isNotFound) notFound();
      throw causa;
    }),
    montarAnexoDaAula(sessao),
  ]);

  const elos: EloBreadcrumb[] = [
    { rotulo: "Cup AI", href: "/ia" },
    { rotulo: conversa.titulo },
  ];

  return (
    <AppShell titulo="Cup AI" breadcrumb={<Breadcrumb elos={elos} />}>
      {/* `h-[calc(...)]` e nao `h-full`: o historico rola dentro da conversa,
          com o campo de pergunta sempre visivel no rodape. Sem altura fixa aqui
          a pagina inteira e' que rolaria, e o campo sumiria da tela justamente
          numa conversa longa — quando ele mais e' usado.

          A largura NAO e' limitada aqui: quem rola e' a lista de mensagens la'
          dentro, e limitar por fora colocaria a barra de rolagem na borda de
          uma caixa estreita, no meio da tela. A largura de leitura e' aplicada
          no conteudo, dentro do proprio VistaChat. */}
      <div className="flex h-[calc(100vh-14rem)] flex-col">
        <VistaChat
          conversa={conversa}
          perguntaPendente={pergunta}
          anexoInicial={anexoInicial}
        />
      </div>
    </AppShell>
  );
}
