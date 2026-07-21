"use client";

import { ThemeToggle } from "@/components/theme/theme-toggle";
import { IconMenu, IconSino } from "@/components/ui/icons";

type HeaderProps = {
  aoAbrirMenu: () => void;
  /** Titulo curto exibido no celular, onde nao ha menu lateral visivel. */
  titulo: string;
  /** Controles da tela (seletor de turma, busca) exibidos no computador. */
  children?: React.ReactNode;
};

export function Header({ aoAbrirMenu, titulo, children }: HeaderProps) {
  return (
    <header className="bg-surface shadow-header sticky top-0 z-30 flex flex-wrap items-center gap-4 px-5 py-4 lg:px-10">
      <button
        type="button"
        onClick={aoAbrirMenu}
        className="text-text flex-none rounded-lg p-1 lg:hidden"
        aria-label="Abrir menu"
      >
        <IconMenu />
      </button>

      <span
        className="text-text flex-1 text-lg font-extrabold lg:hidden"
        style={{ fontFamily: "var(--font-geologica)" }}
      >
        {titulo}
      </span>

      <div className="hidden flex-1 items-center gap-3 lg:flex">{children}</div>

      <div className="flex flex-none items-center gap-3">
        <ThemeToggle />

        <button
          type="button"
          className="bg-surface-2 text-text relative flex h-10 w-10 items-center justify-center rounded-full"
          aria-label="Notificações"
        >
          <IconSino />
          <span
            className="border-surface absolute top-1.5 right-1.5 h-2 w-2 rounded-full border-2"
            style={{ background: "var(--danger)" }}
            aria-hidden
          />
        </button>

        {/* Sem cadastro de professor no banco: dado fixo por ora. */}
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-10 w-10 flex-none items-center justify-center rounded-full text-sm font-extrabold text-white"
            style={{ background: "var(--violet-800)" }}
            aria-hidden
          >
            PM
          </div>
          <div className="hidden sm:block">
            <div className="text-text text-sm font-extrabold">Prof. Monteiro</div>
            <div className="text-text-muted text-xs">Biologia Avançada</div>
          </div>
        </div>
      </div>

      {/* No celular os controles descem para uma segunda linha. */}
      {children && (
        <div className="flex w-full flex-wrap items-center gap-2 lg:hidden">{children}</div>
      )}
    </header>
  );
}
