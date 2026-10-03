import { NextResponse, type NextRequest } from "next/server";

import { comSessao } from "@/app/api/conta/_lib/ponte";
import { lerEquipe } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return comSessao(request, async (lida) => NextResponse.json(await lerEquipe(lida.sessao)));
}
