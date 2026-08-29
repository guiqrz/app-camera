"use client";

import { useState, type ReactNode } from "react";

import { Header } from "./header";
/* SIDEBAR V2 (29/08/2026) — a versao nova, desenhada a partir da segunda
   referencia que ele mandou. A v1 continua em `./sidebar`, intocada: pra
   voltar, troque este import e o uso logo abaixo de volta pra `Sidebar`. */
import { SidebarV2 } from "./sidebar-v2";

type AppShellProps = {
  /** Titulo curto para o cabecalho no celular. */
  titulo: string;
  /** Controles da tela no cabecalho (seletor de turma, busca). */
  controles?: ReactNode;
  /**
   * Trilha de navegacao das telas profundas ("Minhas aulas / 3B / 12 de maio").
   *
   * Vai aqui, e nao em `controles`: o cabecalho renderiza os controles duas
   * vezes (uma por breakpoint), o que duplicaria a trilha. Aqui ela e' unica e
   * aparece nos dois tamanhos de tela — no computador o `titulo` do cabecalho
   * fica escondido, entao sem isso nao sobra nenhum indicador de onde se esta.
   */
  breadcrumb?: ReactNode;
  children: ReactNode;
};

/**
 * Moldura comum a todas as telas: menu lateral e cabecalho.
 *
 * Mantem o estado de abertura da gaveta no celular. E' um componente de
 * navegador porque precisa desse estado; as telas em si continuam podendo
 * ser renderizadas no servidor e entram por `children`.
 */
export function AppShell({
  titulo,
  controles,
  breadcrumb,
  children,
}: AppShellProps) {
  const [menuAberto, setMenuAberto] = useState(false);

  // O PAINEL — a camada que filtra a atmosfera, e o motivo da faixa violeta
  // aparecer como uma barra chapada na lateral quando ela falta.
  //
  // No prototipo o `.app` e' vidro em tela cheia por cima da atmosfera: e' ele
  // que FILTRA a faixa da esquerda — sem esse tratamento a faixa fica crua,
  // com a cor inteira batendo direto no olho.
  //
  // ⚠️ NAO devolva `backdropFilter` aqui (medido em 22/08/2026).
  //
  // `backdrop-filter` custa DUAS passadas de renderizacao por frame, e este
  // elemento cobre a tela inteira (1.615.545 px medidos em 1440x900). Como ele
  // ROLA, o navegador refazia as duas passadas sobre a pagina toda a cada
  // frame de scroll:
  //
  //   /configuracoes    86,9 ms/frame, 59 de 59 frames acima de 20 ms
  //   sem este blur     22,1 ms/frame
  //   estado atual      16,7 ms/frame, 1 de 59  (60 fps no limite do monitor)
  //
  // O efeito NAO foi perdido: o blur mudou de lugar. Ele agora mora na
  // propria `.atmosfera` (ver globals.css), que e' `fixed` — o navegador
  // rasteriza uma vez e reusa enquanto a pagina rola. Mesmo resultado visual,
  // custo pago uma vez em vez de sessenta vezes por segundo.
  //
  // Tentativas que NAO resolvem, ja' medidas: `will-change: backdrop-filter`
  // + `translateZ(0)` (84,9 ms) e `contain: paint` no miolo (87,5 ms). O
  // problema e' a area filtrada, e nenhuma das duas a reduz.
  //
  // A sidebar mantem o vidro dela de proposito: e' `sticky`, nao rola, entao
  // nao paga por frame.
  return (
    <div
      className="relative z-[1] flex min-h-screen"
      style={{ background: "var(--painel)" }}
    >
      <SidebarV2 aberto={menuAberto} aoFechar={() => setMenuAberto(false)} />

      <div className="flex min-w-0 flex-1 flex-col">
        <Header titulo={titulo} aoAbrirMenu={() => setMenuAberto(true)}>
          {controles}
        </Header>

        {/* `.miolo` do prototipo: 18px 28px 30px. O respiro de cima e' menor
            que o dos lados porque o cabecalho ja' abriu 22px acima dele. */}
        <main className="flex-1 px-5 pt-4 pb-7 lg:px-[28px] lg:pt-[18px] lg:pb-[30px]">
          {breadcrumb && <div className="mb-5">{breadcrumb}</div>}
          {children}
        </main>
      </div>
    </div>
  );
}
