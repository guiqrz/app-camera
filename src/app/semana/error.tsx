"use client";

import { useEffect } from "react";

import { EstadoErroApi } from "@/components/layout/estado-erro-api";

export default function ErroSemana({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[cupcam] falha ao carregar a semana:", error);
  }, [error]);

  return <EstadoErroApi error={error} reset={reset} titulo="Minha semana" />;
}
