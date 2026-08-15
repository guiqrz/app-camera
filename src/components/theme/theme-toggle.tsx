"use client";

import { IconLua, IconSol } from "@/components/ui/icons";

import { useTheme } from "./theme-provider";

/** Botao que alterna entre tema claro e escuro. */
export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const escuro = theme === "dark";

  return (
    // `.btn-icone` do prototipo: 33x33, raio total, borda do card e fundo a
    // 0.055 — o mesmo veu do card, porque aqui o botao TEM preenchimento
    // (diferente do seletor ao lado, que fica a 0.035).
    <button
      type="button"
      onClick={toggleTheme}
      className="border-border-default text-text-body grid h-[33px] w-[33px] flex-none place-items-center rounded-full border transition-colors hover:opacity-80"
      style={{ background: "var(--surface)" }}
      // O rotulo diz a ACAO, nao o estado atual: e' o que um leitor de tela
      // anuncia e o que o usuario espera ao ouvir o botao.
      aria-label={escuro ? "Ativar tema claro" : "Ativar tema escuro"}
      title={escuro ? "Ativar tema claro" : "Ativar tema escuro"}
    >
      {escuro ? <IconSol size={15} /> : <IconLua size={15} />}
    </button>
  );
}
