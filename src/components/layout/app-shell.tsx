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

  return (
    <div className="flex min-h-screen">
      <Sidebar aberto={menuAberto} aoFechar={() => setMenuAberto(false)} />

      <div className="flex min-w-0 flex-1 flex-col">
        <Header titulo={titulo} aoAbrirMenu={() => setMenuAberto(true)}>
          {controles}
        </Header>

        <main className="flex-1 px-5 py-7 lg:px-10 lg:py-9">
          {breadcrumb && <div className="mb-5">{breadcrumb}</div>}
          {children}
        </main>
      </div>
    </div>
  );
}
