import "server-only";

import type { NextRequest } from "next/server";

/**
 * IP de quem abriu a pagina, pro limite de tentativas do backend. Na Vercel,
 * `x-real-ip` e' preenchido pela propria plataforma (o cliente nao consegue
 * forjar); `x-forwarded-for` fica de reserva. Sem nenhum, vai vazio e o
 * backend usa um balde comum — o lado restritivo.
 */
export function ipDoNavegador(request: NextRequest): string {
  const real = request.headers.get("x-real-ip");
  if (real) return real.trim();
  const encaminhado = request.headers.get("x-forwarded-for");
  return encaminhado ? encaminhado.split(",")[0].trim() : "";
}
