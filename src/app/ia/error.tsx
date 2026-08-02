"use client";

import { useEffect } from "react";

import { EstadoErroApi } from "@/components/layout/estado-erro-api";

export default function ErroIa({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[cupcam] falha na tela do Cup AI:", error);
  }, [error]);

  return <EstadoErroApi error={error} reset={reset} />;
}
