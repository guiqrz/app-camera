"use client";

import { useState, type ReactNode } from "react";

import { Header } from "./header";
import { Sidebar } from "./sidebar";

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

  // O PAINEL — a camada que faltava, e o motivo da faixa violeta aparecer
  // como uma barra chapada na lateral.
  //
  // No prototipo o `.app` NAO e' so' um container de layout: ele e' vidro em
  // tela cheia (`background: var(--painel)` + `blur(30px)`) por cima da
  // atmosfera. E' esse vidro que FILTRA a faixa da esquerda — sem ele a faixa
  // fica crua, com a cor inteira batendo direto no olho.
  //
  // A sidebar mora DENTRO do painel e tem o proprio `saturate(155%)`, que
  // repuxa a cor ja' filtrada. Sao as duas camadas juntas que dao o efeito:
  // sozinha, a sidebar transparente so' revela a faixa sem tratamento.
  return (
    <div
      className="relative z-[1] flex min-h-screen"
      style={{
        background: "var(--painel)",
        backdropFilter: "var(--blur-painel)",
      }}
    >
      <Sidebar aberto={menuAberto} aoFechar={() => setMenuAberto(false)} />

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
