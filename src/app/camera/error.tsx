"use client";

import { useEffect } from "react";

import { EstadoErroApi } from "@/components/layout/estado-erro-api";

/**
 * Erro da tela "Camera".
 *
 * ⚠️ Backend fora NAO cai aqui: `page.tsx` engole `ApiError` de proposito e
 * abre a tela com a lista de turmas vazia, deixando o polling assumir quando a
 * API voltar. Este arquivo pega o que sobra — falha inesperada de render ou de
 * rede fora do `ApiError`. Quem diagnosticar "a camera abriu no erro" deve
 * procurar ai, e nao no tunel.
 */
export default function ErroCamera({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[cupcam] falha ao carregar a câmera:", error);
  }, [error]);

  return <EstadoErroApi error={error} reset={reset} titulo="Câmera" />;
}
