import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { EsperaDoLogin } from "@/components/login/espera-do-login";
import { COOKIE_LOGIN_PENDENTE } from "@/lib/sessao-cookie";

export const metadata: Metadata = {
  title: "Entrando — Cupcam",
};

/**
 * Tela de espera do login: o professor chega aqui vindo de
 * /entrar/credenciais enquanto a API acorda. Sem o cookie pendente (aba
 * reaberta, prazo vencido, acesso direto) nao ha o que esperar: volta pro
 * comeco do login.
 */
export default async function AguardandoLogin() {
  if (!(await cookies()).has(COOKIE_LOGIN_PENDENTE)) redirect("/entrar/iniciar");
  return <EsperaDoLogin />;
}
