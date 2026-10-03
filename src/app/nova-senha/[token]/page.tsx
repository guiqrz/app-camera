import type { Metadata } from "next";

import { FormularioDeLink } from "@/components/auth/formulario-de-link";
import { fonteDosTitulos } from "@/components/auth/fonte-dos-titulos";
import { PaginaAuth } from "@/components/auth/pagina-auth";

/* Mesmo <title> do criar-conta.html do Strix. noindex: o link e' pessoal.
   no-referrer: a URL carrega o token, e ela nao pode vazar no Referer de
   nenhuma requisicao que a pagina fizer. */
export const metadata: Metadata = {
  title: "Nova senha — Cupcam",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

/**
 * Link de nova senha (`/nova-senha/<token>`), gerado pela coordenacao na aba
 * Equipe. Mesmo caminho do convite. Fora do matcher do proxy (ver
 * src/proxy.ts): quem abre ainda nao tem sessao.
 * Nao le a API aqui no servidor: a pagina abre na hora e o formulario le o
 * link pela ponte /entrar/link, esperando a API acordar se for preciso.
 */
export default async function PaginaDeNovaSenha({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return (
    <PaginaAuth
      classeDaFonte={fonteDosTitulos.variable}
      titulo="Nova senha"
      apoio="Escolha a senha que você vai usar para entrar."
    >
      <FormularioDeLink tipo="nova_senha" token={token} />
    </PaginaAuth>
  );
}
