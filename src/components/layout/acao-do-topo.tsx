"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

/** Id do encaixe no cabecalho, ao lado do alternador de tema (header.tsx). */
export const ID_ACOES_DO_TOPO = "acoes-do-topo";

/**
 * Poe um controle da TELA no cabecalho do AppShell, ao lado do botao de tema.
 *
 * Portal, e nao prop do AppShell: o estado que o botao controla vive dentro
 * da tela (filha do AppShell), e as paginas sao componentes de servidor que so'
 * passam texto pro AppShell. O portal deixa o botao morar na tela, perto do
 * estado, e aparecer no topo.
 *
 * O encaixe e' procurado DEPOIS da montagem: no servidor nao ha `document`, e
 * o cabecalho precisa estar no DOM antes de receber o filho.
 */
export function AcaoDoTopo({ children }: { children: ReactNode }) {
  const [encaixe, setEncaixe] = useState<HTMLElement | null>(null);

  useEffect(() => {
    // setTimeout(0): mesmo padrao do header.tsx pra leitura de DOM depois da
    // montagem, sem setState sincrono dentro do efeito.
    const id = setTimeout(() => setEncaixe(document.getElementById(ID_ACOES_DO_TOPO)), 0);
    return () => clearTimeout(id);
  }, []);

  return encaixe ? createPortal(children, encaixe) : null;
}
