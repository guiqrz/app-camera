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

/**
 * O que o usuario ESCOLHEU, que nao e' a mesma coisa que o tema aplicado:
 * "sistema" significa "nao escolhi nada, siga o aparelho" — e nesse caso o
 * tema aplicado muda sozinho quando o sistema operacional muda.
 */
export type PreferenciaTema = Theme | "sistema";

type ThemeContextValue = {
  /** Tema em vigor agora ("sistema" ja resolvido pra claro ou escuro). */
  theme: Theme;
  /** A escolha do usuario, incluindo "sistema". */
  preferencia: PreferenciaTema;
  /** Alterna claro/escuro. Usado pelo botao do header. */
  toggleTheme: () => void;
  /** Define a preferencia. "sistema" apaga a escolha e volta a seguir o aparelho. */
  definirPreferencia: (proxima: PreferenciaTema) => void;
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
 * Le a escolha do usuario do localStorage.
 *
 * A ausencia da chave E' a informacao: significa "sistema". Por isso nao
 * gravamos a string "sistema" — escolher sistema REMOVE a chave, que e'
 * exatamente o estado que o ThemeScript entende como "deixa a media query
 * decidir". Um valor extra no storage criaria dois jeitos de dizer a mesma
 * coisa, e o script do <head> teria que conhecer os dois.
 */
function lerPreferencia(): PreferenciaTema {
  try {
    const salvo = localStorage.getItem(THEME_STORAGE_KEY);
    if (salvo === "dark" || salvo === "light") return salvo;
  } catch {
    // localStorage bloqueado: trata como "sem escolha".
  }
  return "sistema";
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

  // A preferencia tambem e' lida de fora do React (localStorage), entao segue
  // o mesmo padrao do tema: releitura sob demanda em vez de estado espelhado,
  // que sairia de sincronia se outra aba mudasse a escolha.
  const preferencia = useSyncExternalStore<PreferenciaTema>(
    useCallback(
      (aoMudar: () => void) => {
        void versao;
        return assinarPreferenciaDoSistema(aoMudar);
      },
      [versao],
    ),
    lerPreferencia,
    () => "sistema",
  );

  const definirPreferencia = useCallback((proxima: PreferenciaTema) => {
    const raiz = document.documentElement;

    if (proxima === "sistema") {
      // Remover a chave e o atributo devolve o controle pra media query do
      // semantic.css — mesmo estado de quem nunca escolheu nada.
      raiz.removeAttribute("data-theme");
      try {
        localStorage.removeItem(THEME_STORAGE_KEY);
      } catch {
        // localStorage bloqueado: a escolha vale so' nesta visita.
      }
    } else {
      raiz.setAttribute("data-theme", proxima);
      try {
        localStorage.setItem(THEME_STORAGE_KEY, proxima);
      } catch {
        // localStorage bloqueado: a escolha vale so' nesta visita.
      }
    }

    setVersao((v) => v + 1);
  }, []);

  const toggleTheme = useCallback(() => {
    definirPreferencia(lerTemaAplicado() === "dark" ? "light" : "dark");
  }, [definirPreferencia]);

  return (
    <ThemeContext.Provider
      value={{ theme, preferencia, toggleTheme, definirPreferencia }}
    >
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
