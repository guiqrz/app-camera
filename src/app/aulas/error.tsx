"use client";

import { useEffect } from "react";

import { EstadoErroApi } from "@/components/layout/estado-erro-api";

export default function ErroAulas({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[cupcam] falha ao carregar aulas:", error);
  }, [error]);

  return <EstadoErroApi error={error} reset={reset} titulo="Minhas aulas" />;
}
