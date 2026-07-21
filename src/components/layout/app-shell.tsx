"use client";

import { useState, type ReactNode } from "react";

import { Header } from "./header";
import { Sidebar } from "./sidebar";

type AppShellProps = {
  /** Titulo curto para o cabecalho no celular. */
  titulo: string;
  /** Controles da tela no cabecalho (seletor de turma, busca). */
  controles?: ReactNode;
  children: ReactNode;
};

/**
 * Moldura comum a todas as telas: menu lateral e cabecalho.
 *
 * Mantem o estado de abertura da gaveta no celular. E' um componente de
 * navegador porque precisa desse estado; as telas em si continuam podendo
 * ser renderizadas no servidor e entram por `children`.
 */
export function AppShell({ titulo, controles, children }: AppShellProps) {
  const [menuAberto, setMenuAberto] = useState(false);

  return (
    <div className="flex min-h-screen">
      <Sidebar aberto={menuAberto} aoFechar={() => setMenuAberto(false)} />

      <div className="flex min-w-0 flex-1 flex-col">
        <Header titulo={titulo} aoAbrirMenu={() => setMenuAberto(true)}>
          {controles}
        </Header>

        <main className="flex-1 px-5 py-7 lg:px-10 lg:py-9">{children}</main>
      </div>
    </div>
  );
}
