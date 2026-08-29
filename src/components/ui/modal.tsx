"use client";

import { useEffect, useId, type ReactNode } from "react";

import { useFocoPreso } from "@/components/coordenacao/usar-foco-preso";
import { BotaoIcone } from "@/components/ui/botao-icone";
import { IconFechar } from "@/components/ui/icons";

/**
 * A casca de um modal centrado: veu, card, cabecalho, Esc, clique fora e foco
 * preso.
 *
 * POR QUE EXTRAIR: o mesmo bloco estava copiado em cinco modais da
 * coordenacao, e cada copia trazia junto tres `useEffect` (Esc, trava da
 * rolagem do fundo, foco). Um comportamento de acessibilidade repetido cinco
 * vezes e' um que so' e' corrigido em quatro lugares quando alguem acha um
 * defeito.
 *
 * O QUE ELA NAO FAZ: nao conhece formulario, campo nem envio. O conteudo entra
 * por `children` e o rodape por `rodape` — quem usa decide o que salva e como.
 */

/** Largura do card. `grande` e' pra formulario com secoes; `media` pra 2-3 campos. */
type Largura = "media" | "grande";

const LARGURA: Record<Largura, string> = {
  media: "max-w-md",
  grande: "max-w-2xl",
};

type Props = {
  aberto: boolean;
  titulo: string;
  /** Linha de apoio sob o titulo (a turma, o dia). Opcional. */
  subtitulo?: ReactNode;
  largura?: Largura;
  /** Desliga o X e o clique fora enquanto salva, pra nao perder o que foi digitado. */
  ocupado?: boolean;
  aoFechar: () => void;
  children: ReactNode;
  /** Botoes de acao. Ficam colados no rodape, fora da area que rola. */
  rodape?: ReactNode;
};

export function Modal({
  aberto,
  titulo,
  subtitulo,
  largura = "media",
  ocupado = false,
  aoFechar,
  children,
  rodape,
}: Props) {
  const idTitulo = useId();
  const refModal = useFocoPreso(aberto);

  // Esc fecha — menos enquanto salva: perder o formulario no meio de um envio
  // custa mais que a conveniencia de fechar rapido.
  useEffect(() => {
    if (!aberto) return;
    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key === "Escape" && !ocupado) aoFechar();
    };
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [aberto, ocupado, aoFechar]);

  // Trava a rolagem do fundo: sem isto, rolar dentro do modal "vaza" pra
  // pagina atras quando o conteudo do modal chega ao fim.
  useEffect(() => {
    if (!aberto) return;
    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = anterior;
    };
  }, [aberto]);

  if (!aberto) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={() => {
        if (!ocupado) aoFechar();
      }}
    >
      <div
        ref={refModal}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        onClick={(evento) => evento.stopPropagation()}
        /* `max-h-[90vh]` com o corpo rolando por dentro: um formulario alto num
           monitor baixo empurraria os botoes pra fora da tela, e o modal nao
           rola com a pagina — ela esta travada. */
        className={`flex max-h-[90vh] w-full ${LARGURA[largura]} flex-col rounded-2xl`}
        style={{
          background: "var(--modal)",
          border: "1px solid var(--border)",
          boxShadow: "var(--shadow-raise)",
        }}
      >
        <div className="flex items-start justify-between gap-3 px-6 pt-6 pb-4">
          <div className="min-w-0">
            <h2
              id={idTitulo}
              className="text-text text-lg font-semibold"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {titulo}
            </h2>
            {subtitulo && (
              <p className="text-text-muted mt-0.5 text-[12.5px]">{subtitulo}</p>
            )}
          </div>
          <BotaoIcone
            rotulo="Fechar"
            aoClicar={aoFechar}
            desabilitado={ocupado}
            cor="var(--text-muted)"
          >
            <IconFechar size={20} />
          </BotaoIcone>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-2">{children}</div>

        {rodape && (
          <div className="border-border-default flex items-center justify-end gap-2 border-t px-6 py-4">
            {rodape}
          </div>
        )}
      </div>
    </div>
  );
}
