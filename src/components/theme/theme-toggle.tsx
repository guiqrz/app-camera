"use client";

import { IconLua, IconSol } from "@/components/ui/icons";

import { useTheme } from "./theme-provider";

/** Botao que alterna entre tema claro e escuro. */
export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const escuro = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="bg-surface-2 text-text flex h-10 w-10 flex-none items-center justify-center rounded-full transition-colors hover:opacity-80"
      // O rotulo diz a ACAO, nao o estado atual: e' o que um leitor de tela
      // anuncia e o que o usuario espera ao ouvir o botao.
      aria-label={escuro ? "Ativar tema claro" : "Ativar tema escuro"}
      title={escuro ? "Ativar tema claro" : "Ativar tema escuro"}
    >
      {escuro ? <IconSol /> : <IconLua />}
    </button>
  );
}
