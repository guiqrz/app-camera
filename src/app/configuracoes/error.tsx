"use client";

import { useEffect } from "react";

import { EstadoErroApi } from "@/components/layout/estado-erro-api";

/**
 * Erro da tela "Configuracoes".
 *
 * Ela ja' tinha `loading.tsx` e nao tinha este par (04/09/2026). Faz falta
 * especial aqui: e' a tela que a pessoa abre JUSTAMENTE quando desconfia que
 * algo parou de funcionar, entao cair no erro generico do Next — sem sidebar,
 * sem "Tentar novamente" — e' o pior lugar possivel pra perder a navegacao.
 */
export default function ErroConfiguracoes({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[cupcam] falha ao carregar as configurações:", error);
  }, [error]);

  return <EstadoErroApi error={error} reset={reset} titulo="Configurações" />;
}
