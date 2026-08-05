"use client";

import type { ReactNode } from "react";

import { DicaAjuda } from "@/components/ui/dica-ajuda";
import { IconAulas, IconLousa, IconRelatorios, IconRelogio } from "@/components/ui/icons";
import { aparenciaDaCorMateria } from "@/lib/format";
import { MODO_PADRAO } from "@/lib/modos-camera";
import type { ModoCamera, ModoCameraInfo } from "@/lib/types";

/**
 * Um icone por modo. Fica no frontend (e nao vem da API junto do rotulo)
 * porque icone e' escolha visual desta tela, nao regra de negocio do backend.
 */
const ICONES: Record<ModoCamera, ReactNode> = {
  aula: <IconAulas size={20} />,
  descanso: <IconRelogio size={20} />,
  prova: <IconRelatorios size={20} />,
  lousa: <IconLousa size={20} />,
};

type SeletorModoProps = {
  /** Modos disponiveis, com rotulo, resumo, detalhe e cor vindos do backend. */
  modos: ModoCameraInfo[];
  /**
   * Modo em vigor NA CAMERA (vem do polling), nao o ultimo clicado. E' ele que
   * pinta o cartao ativo — o professor precisa ver o que esta valendo de fato.
   */
  ativo: ModoCamera;
  /**
   * Modo clicado que ainda nao foi confirmado pelo polling, ou null. Some
   * sozinho quando `ativo` alcanca o valor pedido.
   */
  pendente?: ModoCamera | null;
  /** Desliga os cartoes (troca em curso, ou camera fora do ar). */
  desabilitado?: boolean;
  aoEscolher: (modo: ModoCamera) => void;
};

/**
 * Cartoes de modo da camera.
 *
 * Cartao em vez de menu suspenso: os modos ficam visiveis de uma vez, com o
 * resumo do que cada um faz — uma feature nova escondida atras de um select
 * nao seria descoberta. Renderiza como radiogroup pra leitor de tela anunciar
 * a posicao e as setas navegarem entre as opcoes.
 *
 * Cor: cada modo tem a sua (vem do backend como id de paleta), visivel o tempo
 * todo no icone e na borda, mas o FUNDO tingido e' exclusivo do ativo. Varios
 * fundos fortes lado a lado competiriam entre si, e "qual esta valendo agora"
 * e' a informacao mais importante da faixa. A cor nunca e' o unico sinal: o
 * selo "Ativo" escrito esta sempre junto (WCAG 1.4.1).
 */
export function SeletorModo({
  modos,
  ativo,
  pendente = null,
  desabilitado = false,
  aoEscolher,
}: SeletorModoProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Modo da câmera"
      /* 2 colunas no tablet e 4 no desktop: com 4 modos, `sm:grid-cols-3`
         deixava o ultimo sozinho numa linha, parecendo item de outra
         categoria. Em 2x2 eles ficam equilibrados, e no desktop cabem os 4
         lado a lado — que e' o que deixa o professor comparar de relance. */
      className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
    >
      {modos.map((modo) => {
        const selecionado = modo.id === ativo;
        const aguardando = modo.id === pendente && !selecionado;
        // Cor desconhecida (backend mais novo que esta tela) cai em null e o
        // cartao fica neutro, em vez de quebrar a faixa inteira.
        const aparencia = aparenciaDaCorMateria(modo.cor);

        return (
          // O cartao e' esta div (borda, fundo, cor); o <button> so' captura o
          // clique, esticado por cima via inset-0. Assim o "?" e' um botao IRMAO
          // e nao filho — botao dentro de botao e' HTML invalido e o clique vira
          // loteria — e mesmo assim o texto do cartao fica ACIMA do <button> na
          // pilha, senao ele cobriria o "?" e engoliria o clique da ajuda.
          <div
            key={modo.id}
            className="relative flex flex-col gap-1.5 rounded-2xl border p-4 transition-colors"
            style={{
              // Ativo pega a cor do proprio modo; inativo fica na borda neutra
              // do tema.
              borderColor: selecionado ? (aparencia?.texto ?? "var(--primary)") : "var(--border)",
              background: selecionado ? (aparencia?.fundo ?? "var(--surface-soft)") : "var(--surface)",
              // Anel interno engrossa a borda do ativo sem mexer no layout
              // (border-width maior deslocaria o conteudo em 1px).
              boxShadow: selecionado
                ? `inset 0 0 0 1px ${aparencia?.texto ?? "var(--primary)"}`
                : "none",
              opacity: desabilitado ? 0.6 : 1,
            }}
          >
            <button
              type="button"
              role="radio"
              aria-checked={selecionado}
              aria-label={`${modo.rotulo}. ${modo.resumo}`}
              disabled={desabilitado}
              onClick={() => aoEscolher(modo.id)}
              className="focus-visible:ring-primary absolute inset-0 z-0 rounded-2xl focus-visible:ring-2 focus-visible:outline-none disabled:cursor-not-allowed"
            />

            {/* Icone e "?" dividem a primeira linha; o rotulo desce pra linha de
                baixo com a largura inteira do cartao.

                Tentei os dois na mesma linha e nao cabe: no grid de 3 o cartao
                fica com 135px, e icone + "Descanso" + "?" so' passava com
                `truncate`, que exibia "Des…" — perder o nome do modo e' pior que
                o problema que resolvia. Duas linhas cabem em qualquer largura, e
                sobra espaco pra um rotulo maior no futuro. */}
            <div className="pointer-events-none relative z-10 -mb-0.5 flex items-start justify-between gap-1">
              {/* Icone colorido mesmo inativo: e' o que deixa o professor decorar
                  "roxo = Aula" antes mesmo de selecionar. */}
              <span aria-hidden style={{ color: aparencia?.texto ?? "var(--text)" }}>
                {ICONES[modo.id]}
              </span>

              {/* Reativa o ponteiro so' na ajuda: o cabecalho inteiro e'
                  pointer-events-none pra o clique atravessar ate' o <button>
                  que esta atras. */}
              <DicaAjuda
                texto={modo.detalhe}
                rotulo={`O que muda no modo ${modo.rotulo}`}
                className="pointer-events-auto shrink-0"
                lado="direita"
              />
            </div>

            {/* `items-baseline` alinha "(padrao)" pela linha de base do rotulo,
                nao pelo centro: sao dois tamanhos diferentes, e centralizar
                deixaria o menor flutuando alto. */}
            <span className="pointer-events-none relative z-10 flex flex-wrap items-baseline gap-x-1.5">
              <span
                aria-hidden
                className="text-sm font-extrabold"
                style={{ color: aparencia?.texto ?? "var(--text)" }}
              >
                {modo.rotulo}
              </span>

              {/* "(padrao)" so' faz sentido em quem NAO esta valendo agora: no
                  ativo, o selo "Ativo" ja' ocupa a linha e e' o que importa.
                  `flex-wrap` no pai deixa ele cair pra linha de baixo em vez de
                  espremer o nome do modo num cartao estreito. */}
              {modo.id === MODO_PADRAO && !selecionado && !aguardando && (
                <span aria-hidden className="text-text-muted text-[11px]">
                  (padrão)
                </span>
              )}
            </span>

            {/* Daqui pra baixo e' texto decorativo: o <button> ja' anuncia rotulo
                e resumo pelo aria-label, entao o leitor de tela nao repete. */}
            <span aria-hidden className="text-text-muted pointer-events-none relative z-10 text-xs leading-relaxed">
              {modo.resumo}
            </span>

            {/* Estado em texto, nao so' em cor. "Aplicando" e' honesto: a troca
                so' vale quando o backend le o comando, alguns segundos depois. */}
            {selecionado && (
              <span
                aria-hidden
                className="pointer-events-none relative z-10 text-[11px] font-extrabold tracking-wide uppercase"
                style={{ color: aparencia?.texto ?? "var(--primary)" }}
              >
                Ativo
              </span>
            )}
            {aguardando && (
              <span
                className="pointer-events-none relative z-10 text-[11px] font-extrabold tracking-wide uppercase"
                style={{ color: "var(--warn-fg)" }}
              >
                Aplicando…
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
