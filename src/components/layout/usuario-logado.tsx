"use client";

import { createContext, useContext } from "react";

import { iniciais, nomeDeExibicao, rotuloDoPapel } from "@/lib/usuario-exibicao";

/**
 * Quem esta logado, como a barra lateral precisa: so' o que se mostra na tela.
 *
 * O id da sessao NUNCA entra aqui. Este contexto vai pro JavaScript do
 * navegador, e o cookie de sessao e' HttpOnly justamente pra ninguem no
 * navegador conseguir le-lo.
 */
export type UsuarioLogado = {
  nome: string;
  email: string;
  papel: string;
};

const ContextoUsuarioLogado = createContext<UsuarioLogado | null>(null);

/**
 * Entrega o usuario lido do cookie (no layout raiz, no servidor) pra qualquer
 * componente cliente abaixo. Existe porque a barra lateral roda no navegador e
 * nao consegue ler o cookie HttpOnly sozinha.
 */
export function ProvedorUsuarioLogado({
  usuario,
  children,
}: {
  usuario: UsuarioLogado | null;
  children: React.ReactNode;
}) {
  return (
    <ContextoUsuarioLogado.Provider value={usuario}>{children}</ContextoUsuarioLogado.Provider>
  );
}

/** `null` fora de sessao (ex.: tela de erro do login). */
export function useUsuarioLogado(): UsuarioLogado | null {
  return useContext(ContextoUsuarioLogado);
}

/**
 * O cartao de usuario das barras laterais, ja' pronto pra exibir. As duas
 * sidebars (sidebar.tsx e sidebar-v2.tsx) usam este mesmo hook pra nao
 * repetir a regra de "sem nome, cai pro email".
 *
 * Sem usuario (nao deveria acontecer dentro do app: o proxy barra antes),
 * devolve rotulos neutros em vez de quebrar a barra lateral.
 */
export function useCartaoDoUsuario(): { nome: string; papel: string; iniciais: string } {
  const usuario = useUsuarioLogado();
  if (!usuario) return { nome: "Conta", papel: "", iniciais: "?" };
  const nome = nomeDeExibicao(usuario.nome, usuario.email);
  return { nome, papel: rotuloDoPapel(usuario.papel), iniciais: iniciais(nome) };
}
