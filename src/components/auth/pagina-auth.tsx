"use client";

import type { ReactNode } from "react";

import { useTheme } from "@/components/theme/theme-provider";

import "@/app/auth-strix.css";

type PaginaAuthProps = {
  /** `fonteDosTitulos.variable` (ver fonte-dos-titulos.ts), vindo da pagina. */
  classeDaFonte: string;
  titulo: string;
  apoio: ReactNode;
  children: ReactNode;
};

/**
 * Casca das paginas de link (/convite e /nova-senha), com o visual do
 * html/criar-conta.html do site Strix -- marcacao copiada de la', classe por
 * classe, pro CSS portado (auth-strix.css) casar sem ajuste.
 *
 * Diferencas deliberadas em relacao ao HTML do Strix (spec §7): o botao de
 * tema alterna o tema DO APP, e o rodape leva pro login do app.
 */
export function PaginaAuth({ classeDaFonte, titulo, apoio, children }: PaginaAuthProps) {
  return (
    <div className={`pagina-auth ${classeDaFonte}`}>
      <main className="auth">
        <div className="auth-arte">
          <div className="auth-topo-mobile">
            <span className="auth-logo auth-logo-mobile">
              {/* eslint-disable-next-line @next/next/no-img-element -- visual identico ao Strix: o CSS portado estiliza o <img> direto */}
              <img src="/auth/logo.png" alt="Logo da equipe Strix" />
            </span>
            <BotaoTema />
          </div>

          {/* eslint-disable-next-line @next/next/no-img-element -- visual identico ao Strix: o CSS portado estiliza o <img> direto */}
          <img
            src="/auth/mascote-ideia.png"
            alt="Mascote da Cupcam com uma ideia"
            className="auth-mascote"
          />
        </div>

        <div className="auth-form">
          <div className="auth-topo-desktop">
            <span className="auth-logo">
              {/* eslint-disable-next-line @next/next/no-img-element -- visual identico ao Strix: o CSS portado estiliza o <img> direto */}
              <img src="/auth/logo.png" alt="Logo da equipe Strix" />
            </span>
            <BotaoTema />
          </div>

          <div className="auth-conteudo">
            <div className="auth-titulos">
              <h2>{titulo}</h2>
              <p>{apoio}</p>
            </div>
            {children}
          </div>

          <p className="auth-rodape">
            Já tem uma conta? <a href="/entrar/iniciar">Login</a>
          </p>
        </div>
      </main>
    </div>
  );
}

/** Mesmo desenho do botao de tema do Strix; as duas imagens trocam pelo CSS. */
function BotaoTema() {
  const { theme, toggleTheme } = useTheme();
  return (
    <button
      type="button"
      className="tema tema-flutuante"
      onClick={toggleTheme}
      aria-label={theme === "dark" ? "Mudar para o tema claro" : "Mudar para o tema escuro"}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- visual identico ao Strix: o CSS portado estiliza o <img> direto */}
      <img src="/auth/modo-escuro.svg" alt="" className="tema-icone-escuro" />
      {/* eslint-disable-next-line @next/next/no-img-element -- visual identico ao Strix: o CSS portado estiliza o <img> direto */}
      <img src="/auth/modo-claro.svg" alt="" className="tema-icone-claro" />
    </button>
  );
}
