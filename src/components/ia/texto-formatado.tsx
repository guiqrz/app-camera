import type { ReactNode } from "react";

/**
 * Renderiza o subconjunto de Markdown que o modelo de fato usa.
 *
 * Por que nao uma biblioteca: o assistente escreve titulo, negrito, italico,
 * `codigo` e lista — nada de tabela, HTML embutido ou link de referencia. Um
 * `react-markdown` traria tres pacotes e a necessidade de configurar
 * sanitizacao pra formatar bolha de chat.
 *
 * SEGURANCA: monta elementos React, nunca `dangerouslySetInnerHTML`. O texto
 * vem de um modelo, que por sua vez leu PDF e transcricao de terceiros — HTML
 * cru ali seria um caminho de XSS. Aqui `<script>` no meio da resposta e'
 * apenas texto que aparece na tela.
 */

/** Marcacoes de trecho, na ordem em que sao procuradas. */
const INLINE = [
  { abre: "**", classe: "font-bold" },
  { abre: "`", classe: "rounded bg-surface-2 px-1 py-0.5 font-mono text-[0.9em]" },
  { abre: "*", classe: "italic" },
] as const;

/**
 * Aplica negrito/italico/codigo dentro de uma linha.
 *
 * Recursivo: o trecho DEPOIS do fechamento volta pra ca, entao uma linha com
 * varias marcacoes e' resolvida por inteiro. O trecho de DENTRO nao recursa —
 * negrito dentro de italico nao aparece em resposta de chat, e tentar aninhar
 * complicaria o corte sem ganho real.
 */
function formatarTrechos(texto: string, chave: string): ReactNode[] {
  // Procura o marcador que aparece PRIMEIRO na linha, e nao o primeiro da
  // lista INLINE. Percorrendo na ordem da lista, uma linha como
  // "`codigo` e *italico* e **negrito**" achava o ** la' no fim, formatava so'
  // ele, e devolvia todo o comeco como texto cru — o ` e o * apareciam na tela.
  let escolhido: { inicio: number; fim: number; abre: string; classe: string } | null =
    null;

  for (const { abre, classe } of INLINE) {
    const inicio = texto.indexOf(abre);
    if (inicio === -1) continue;

    const fim = texto.indexOf(abre, inicio + abre.length);
    // Marcador sozinho (um `*` solto no meio da frase) fica como texto — sem
    // isto a linha inteira sumia atras de uma marcacao nunca fechada.
    if (fim === -1) continue;

    // `** **` vazio nao vira elemento: seria um <strong> invisivel.
    if (!texto.slice(inicio + abre.length, fim)) continue;

    // Empate na mesma posicao: vence o marcador mais LONGO, senao o "*" de
    // italico comeria a primeira metade de um "**" de negrito.
    if (
      escolhido === null ||
      inicio < escolhido.inicio ||
      (inicio === escolhido.inicio && abre.length > escolhido.abre.length)
    ) {
      escolhido = { inicio, fim, abre, classe };
    }
  }

  if (escolhido === null) return [texto];

  const { inicio, fim, abre, classe } = escolhido;
  return [
    texto.slice(0, inicio),
    <span key={`${chave}-${inicio}`} className={classe}>
      {texto.slice(inicio + abre.length, fim)}
    </span>,
    ...formatarTrechos(texto.slice(fim + abre.length), `${chave}-r${inicio}`),
  ];
}

/** Uma linha vira titulo, item de lista ou paragrafo. */
function formatarLinha(linha: string, chave: string): ReactNode {
  const titulo = /^(#{1,6})\s+(.*)$/.exec(linha);
  if (titulo) {
    return (
      <p key={chave} className="text-text mt-1 font-bold">
        {formatarTrechos(titulo[2], chave)}
      </p>
    );
  }

  // "- item", "* item" ou "1. item". O marcador vira bullet proprio: manter o
  // "-" cru deixava a resposta com cara de arquivo de texto.
  const item = /^\s*(?:[-*+]|\d+[.)])\s+(.*)$/.exec(linha);
  if (item) {
    return (
      <span key={chave} className="flex gap-2">
        <span aria-hidden className="select-none">
          •
        </span>
        <span>{formatarTrechos(item[1], chave)}</span>
      </span>
    );
  }

  // Linha vazia vira respiro entre paragrafos, nao um <p> vazio que o leitor
  // de tela anunciaria.
  if (!linha.trim()) return <span key={chave} className="h-2" aria-hidden />;

  return <span key={chave}>{formatarTrechos(linha, chave)}</span>;
}

type TextoFormatadoProps = {
  texto: string;
};

/** Texto do assistente com a formatacao aplicada, uma linha por vez. */
export function TextoFormatado({ texto }: TextoFormatadoProps) {
  return (
    <span className="flex flex-col">
      {texto.split("\n").map((linha, indice) => formatarLinha(linha, `l${indice}`))}
    </span>
  );
}
