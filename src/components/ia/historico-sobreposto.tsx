"use client";

import { useEffect, useRef, useState } from "react";

import { PainelHistorico } from "@/components/ia/painel-historico";
import { AcaoDoTopo } from "@/components/layout/acao-do-topo";
import { IconRelogio } from "@/components/ui/icons";
import type { Conversa } from "@/lib/types";

/** Mesmo corte do `.conteudo-ia` empilhado em globals.css. */
const MEDIA_TELA_ESTREITA = "(max-width: 1100px)";

type Props = {
  conversas: Conversa[];
  aoApagar: (conversaId: number) => Promise<void>;
  aoNova: () => void;
};

/**
 * Historico do Cup AI no celular e no tablet (01/10/2026): botao no topo, ao
 * lado do tema, que abre o historico POR CIMA da tela.
 *
 * Substitui o historico empilhado embaixo do miolo, que tinha dois defeitos:
 * dividia a altura com a abertura (que rolava) e, fechado, nao voltava mais —
 * a aba de reabrir e' escondida abaixo de 1100px, porque ela vive na coluna
 * lateral que ali nao existe.
 *
 * No computador este componente nao aparece (CSS): la' o historico continua
 * na coluna da direita, com o comportamento de sempre.
 */
export function HistoricoSobreposto({ conversas, aoApagar, aoNova }: Props) {
  const [aberto, setAberto] = useState(false);
  const botao = useRef<HTMLButtonElement>(null);
  const painel = useRef<HTMLDivElement>(null);

  const fechar = () => {
    setAberto(false);
    // O foco volta pra quem abriu: sem isso, quem navega por teclado cairia
    // no topo da pagina depois de fechar.
    botao.current?.focus();
  };

  useEffect(() => {
    if (!aberto) return;
    painel.current?.focus();

    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") fechar();
    };
    // Se a janela crescer pro tamanho do computador com o painel aberto, ele
    // fecharia sozinho: la' o historico ja' esta' na coluna, e os dois juntos
    // mostrariam a lista duas vezes.
    const midia = window.matchMedia(MEDIA_TELA_ESTREITA);
    const aoMudarTamanho = () => {
      if (!midia.matches) setAberto(false);
    };
    // A pagina atras nao rola enquanto o painel esta aberto.
    const rolagemAntes = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    document.addEventListener("keydown", aoTeclar);
    midia.addEventListener("change", aoMudarTamanho);
    return () => {
      document.body.style.overflow = rolagemAntes;
      document.removeEventListener("keydown", aoTeclar);
      midia.removeEventListener("change", aoMudarTamanho);
    };
  }, [aberto]);

  return (
    <>
      <AcaoDoTopo>
        <button
          ref={botao}
          type="button"
          onClick={() => setAberto(true)}
          // Mesmo `.btn-icone` do alternador de tema ao lado (theme-toggle.tsx):
          // os dois dividem a linha e tem que parecer um par.
          className="historico-botao-topo border-border-default text-text-body grid h-[33px] w-[33px] flex-none place-items-center rounded-full border transition-colors hover:opacity-80"
          style={{ background: "var(--surface)" }}
          aria-label="Abrir o histórico de conversas"
          aria-expanded={aberto}
          aria-controls="historico-sobreposto"
          title="Histórico"
        >
          <IconRelogio size={15} />
        </button>
      </AcaoDoTopo>

      {aberto && (
        <div className="historico-sobreposicao">
          {/* Tocar fora fecha. E' um botao de verdade (nao um div com onClick)
              pra ter papel e rotulo, mas fica fora da ordem do Tab: o X do
              painel ja' e' o caminho de teclado. */}
          <button
            type="button"
            className="historico-sobreposicao-fundo"
            onClick={fechar}
            aria-label="Fechar o histórico"
            tabIndex={-1}
          />
          <div
            ref={painel}
            id="historico-sobreposto"
            className="historico-sobreposicao-painel"
            role="dialog"
            aria-modal="true"
            aria-label="Histórico de conversas"
            tabIndex={-1}
          >
            <PainelHistorico
              conversas={conversas}
              aoApagar={aoApagar}
              aoNova={() => {
                setAberto(false);
                aoNova();
              }}
              aoFechar={fechar}
            />
          </div>
        </div>
      )}
    </>
  );
}
