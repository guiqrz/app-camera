"use client";

import { useEffect } from "react";

import { EstadoErroApi } from "@/components/layout/estado-erro-api";

export default function ErroRelatoriosPeriodo({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[cupcam] falha ao carregar fim de período:", error);
  }, [error]);

  return <EstadoErroApi error={error} reset={reset} titulo="Fim de período" />;
}
