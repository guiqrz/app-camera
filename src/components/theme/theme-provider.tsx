"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import { THEME_STORAGE_KEY } from "./theme-script";

export type Theme = "light" | "dark";

type ThemeContextValue = {
  theme: Theme;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

/** Le o tema que o ThemeScript ja aplicou no <html>. */
function lerTemaAplicado(): Theme {
  const atributo = document.documentElement.getAttribute("data-theme");
  if (atributo === "dark" || atributo === "light") return atributo;

  // Sem escolha manual: quem manda e' a preferencia do sistema.
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

/**
 * Assina mudancas na preferencia de tema do sistema operacional.
 *
 * Usado com useSyncExternalStore em vez de useEffect + setState: o tema vive
 * fora do React (no atributo data-theme e no sistema), entao ler de la na
 * hora da renderizacao evita o render extra que o setState-em-efeito causa.
 */
function assinarPreferenciaDoSistema(aoMudar: () => void): () => void {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", aoMudar);
  return () => media.removeEventListener("change", aoMudar);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Contador que muda a cada alternancia manual, so' para forcar o
  // useSyncExternalStore a reler o atributo data-theme.
  const [versao, setVersao] = useState(0);

  const theme = useSyncExternalStore<Theme>(
    // Reassina quando `versao` muda, garantindo releitura apos o toggle.
    useCallback(
      (aoMudar: () => void) => {
        void versao;
        return assinarPreferenciaDoSistema(aoMudar);
      },
      [versao],
    ),
    lerTemaAplicado,
    // No servidor nao ha como saber a preferencia; "light" e' o padrao e o
    // ThemeScript corrige antes da primeira pintura no navegador.
    () => "light",
  );

  const toggleTheme = useCallback(() => {
    const proximo: Theme = lerTemaAplicado() === "dark" ? "light" : "dark";

    document.documentElement.setAttribute("data-theme", proximo);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, proximo);
    } catch {
      // localStorage bloqueado: o tema vale so' nesta visita.
    }

    setVersao((v) => v + 1);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const contexto = useContext(ThemeContext);

  if (contexto === null) {
    throw new Error("useTheme precisa estar dentro de <ThemeProvider>");
  }

  return contexto;
}
