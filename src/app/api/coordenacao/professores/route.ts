import { NextResponse } from "next/server";

import { statusSeguro } from "@/app/api/admin/_lib/status-seguro";
import { ApiError, listarProfessores } from "@/lib/api";

/**
 * Ponte da lista de professores (papeis, 03/10/2026): alimenta o select
 * "Professor" da grade e o filtro da agenda da coordenacao. O proxy so' deixa
 * coordenacao e admin chegarem aqui; o backend confere de novo (403).
 */
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await listarProfessores());
  } catch (causa) {
    if (causa instanceof ApiError) {
      return NextResponse.json(
        { erro: "Não foi possível carregar os professores. Tente novamente em instantes." },
        { status: statusSeguro(causa) },
      );
    }
    throw causa;
  }
}
