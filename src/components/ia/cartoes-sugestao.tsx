"use client";

import type { ReactNode } from "react";

import {
  IconLousa,
  IconInterrogacao,
  IconTranscricao,
} from "@/components/ui/icons";

/**
 * Os tres cartoes de acao da abertura do Cup AI.
 *
 * Eles PREENCHEM o campo de pergunta com um rascunho editavel — nao disparam a
 * pergunta. A diferenca importa: mandar sem o professor ler gastaria uma
 * chamada ao modelo por engano de clique, e o texto e' um ponto de partida
 * (falta a data da aula), nao a pergunta final dele.
 *
 * O `|` nos rascunhos marca onde o cursor deve parar. Ele nunca chega a
 * aparecer no campo: `aplicarRascunho` corta o marcador e devolve a posicao.
 */

type Cartao = {
  id: string;
  icone: ReactNode;
  /** Classe da pastilha colorida — ver `.rec-icone-*` em globals.css. */
  tom: "roxo" | "azul" | "verde";
  titulo: string;
  texto: string;
  /** Rascunho com `|` marcando a posicao do cursor. */
  rascunho: string;
};

const CARTOES: Cartao[] = [
  {
    id: "material",
    icone: <IconLousa size={15} />,
    tom: "roxo",
    titulo: "Gerar material",
    texto: "Slides ou PDF a partir do conteúdo já registrado",
    rascunho: "Gere os slides da aula de |",
  },
  {
    id: "resumo",
    icone: <IconTranscricao size={15} />,
    tom: "azul",
    titulo: "Resumir uma aula",
    texto: "O que foi dado, em poucos parágrafos",
    rascunho: "Resuma o que foi dado na aula de |",
  },
  {
    id: "duvida",
    icone: <IconInterrogacao size={15} />,
    tom: "verde",
    titulo: "Tirar uma dúvida",
    texto: "Pergunte qualquer coisa sobre uma aula sua",
    rascunho: "Sobre a aula de |, queria entender ",
  },
];

/**
 * Separa o texto do rascunho da posicao do cursor.
 *
 * Sem marcador, o cursor vai pro fim — que e' o comportamento natural de quem
 * comeca a digitar num campo recem-preenchido.
 */
export function aplicarRascunho(rascunho: string): {
  texto: string;
  cursor: number;
} {
  const marcador = rascunho.indexOf("|");
  if (marcador === -1) return { texto: rascunho, cursor: rascunho.length };
  const texto = rascunho.slice(0, marcador) + rascunho.slice(marcador + 1);
  return { texto, cursor: marcador };
}

type Props = {
  /** Recebe o rascunho ja' sem o marcador, e onde o cursor deve ficar. */
  aoEscolher: (texto: string, cursor: number) => void;
};

export function CartoesSugestao({ aoEscolher }: Props) {
  return (
    <div className="rec-grade">
      {CARTOES.map((cartao) => (
        <button
          key={cartao.id}
          type="button"
          className="rec"
          onClick={() => {
            const { texto, cursor } = aplicarRascunho(cartao.rascunho);
            aoEscolher(texto, cursor);
          }}
        >
          <span className={`rec-icone rec-icone-${cartao.tom}`} aria-hidden>
            {cartao.icone}
          </span>
          <span className="rec-titulo">{cartao.titulo}</span>
          <span className="rec-texto">{cartao.texto}</span>
        </button>
      ))}
    </div>
  );
}
