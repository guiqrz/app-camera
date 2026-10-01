"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

import {
  IconAulas,
  IconCalendario,
  IconCheck,
  IconFicha,
  IconLousa,
  IconInterrogacao,
  IconSetaDireita,
  IconSetaEsquerda,
  IconTranscricao,
} from "@/components/ui/icons";
import { estadoDasSetas } from "@/lib/carrossel";

/**
 * Os cartoes de acao da abertura do Cup AI.
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

// A ORDEM e' a de descoberta: os tres primeiros aparecem sem rolar, entao sao
// as capacidades mais fortes e que o professor menos adivinha sozinho
// (decidido com o usuario em 01/10/2026).
const CARTOES: Cartao[] = [
  // Os dois primeiros entraram em 01/10/2026, junto com o carrossel. O
  // "Planejar" cobre plano + roteiro: o roteiro nasce do botao no cartao do
  // plano, entao um cartao so' leva ao fluxo inteiro sem confundir.
  {
    id: "planejar",
    icone: <IconAulas size={15} />,
    tom: "verde",
    titulo: "Planejar uma aula",
    texto: "Plano formal + roteiro pra estudar antes",
    rascunho: "Monta o plano de aula de | para a turma ",
  },
  {
    id: "exercicios",
    icone: <IconFicha size={15} />,
    tom: "azul",
    titulo: "Lista de exercícios",
    texto: "Questões reais do ENEM, Fuvest e Unicamp",
    rascunho: "Monta uma lista de 10 exercícios de |",
  },
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
  // Os dois abaixo entraram em 06/09/2026, quando o assistente ganhou agenda,
  // plano e lembretes. Eles existem porque a capacidade nova e' INVISIVEL: o
  // professor nao tem como adivinhar que agora da' pra marcar uma prova
  // conversando, e uma ferramenta que ninguem descobre e' o mesmo que nao ter.
  {
    id: "agenda",
    icone: <IconCalendario size={15} />,
    tom: "azul",
    titulo: "Marcar na agenda",
    texto: "Prova, recado ou aula cancelada, num dia certo",
    // O dia fica por ultimo e o cursor para nele: e' o campo que muda a cada
    // uso, e o resto da frase ja diz ao modelo qual ferramenta usar.
    rascunho: "Marca uma prova de | para a turma ",
  },
  {
    id: "lembrete",
    icone: <IconCheck size={15} />,
    tom: "roxo",
    titulo: "Anotar um lembrete",
    texto: "Um recado seu, sem turma nem data",
    rascunho: "Lembra de eu |",
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

/** Quanto a roda do mouse anda por "linha" quando o navegador mede em linhas. */
const PIXELS_POR_LINHA_DA_RODA = 16;

/**
 * Os cartoes numa LINHA SO', em carrossel (01/10/2026). Antes eram uma grade
 * que quebrava em 2-3 linhas e empurrava a abertura pra fora da tela, criando
 * scroll. Agora: 3 visiveis no computador (2 no tablet, 1 e pouco no
 * celular), setas nas pontas, e arrastar/trackpad/roda do mouse funcionando.
 *
 * So' CSS (scroll-snap) + um pouco de JS pras setas: sem biblioteca de
 * carrossel, que seria dependencia nova pra algo que o navegador ja' faz.
 */
export function CartoesSugestao({ aoEscolher }: Props) {
  const trilho = useRef<HTMLDivElement>(null);
  const [setas, setSetas] = useState({ anterior: false, proxima: false });

  const atualizarSetas = useCallback(() => {
    const elemento = trilho.current;
    if (!elemento) return;
    setSetas(estadoDasSetas(elemento.scrollLeft, elemento.clientWidth, elemento.scrollWidth));
  }, []);

  useEffect(() => {
    const elemento = trilho.current;
    if (!elemento) return;
    atualizarSetas();
    // A largura muda com a janela (e com o historico abrindo/fechando): as
    // setas precisam reavaliar se ainda ha' o que rolar.
    const observador = new ResizeObserver(atualizarSetas);
    observador.observe(elemento);

    // Roda do mouse vertical vira rolagem horizontal da linha. Listener nativo
    // com `passive: false` porque o do React e' passivo e nao deixa impedir a
    // rolagem vertical. Nas pontas a roda passa adiante, sem prender a pagina.
    const aoRodar = (evento: WheelEvent) => {
      if (Math.abs(evento.deltaY) <= Math.abs(evento.deltaX)) return;
      const delta =
        evento.deltaMode === WheelEvent.DOM_DELTA_LINE
          ? evento.deltaY * PIXELS_POR_LINHA_DA_RODA
          : evento.deltaY;
      const { anterior, proxima } = estadoDasSetas(
        elemento.scrollLeft,
        elemento.clientWidth,
        elemento.scrollWidth,
      );
      if ((delta > 0 && !proxima) || (delta < 0 && !anterior)) return;
      evento.preventDefault();
      elemento.scrollBy({ left: delta });
    };
    elemento.addEventListener("wheel", aoRodar, { passive: false });
    return () => {
      observador.disconnect();
      elemento.removeEventListener("wheel", aoRodar);
    };
  }, [atualizarSetas]);

  const passar = (direcao: 1 | -1) => {
    const elemento = trilho.current;
    if (!elemento) return;
    // Uma "pagina" por clique: a largura visivel inteira, que o scroll-snap
    // ajusta pro inicio do cartao seguinte.
    const semAnimacao = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    elemento.scrollBy({
      left: direcao * elemento.clientWidth,
      behavior: semAnimacao ? "auto" : "smooth",
    });
  };

  return (
    <div className="rec-carrossel">
      {setas.anterior && (
        <button
          type="button"
          className="rec-seta rec-seta-anterior"
          onClick={() => passar(-1)}
          aria-label="Ver sugestões anteriores"
        >
          <IconSetaEsquerda size={15} />
        </button>
      )}
      <div
        ref={trilho}
        className="rec-trilho"
        onScroll={atualizarSetas}
        role="group"
        aria-label="Sugestões do Cup AI"
      >
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
      {setas.proxima && (
        <button
          type="button"
          className="rec-seta rec-seta-proxima"
          onClick={() => passar(1)}
          aria-label="Ver mais sugestões"
        >
          <IconSetaDireita size={15} />
        </button>
      )}
    </div>
  );
}
