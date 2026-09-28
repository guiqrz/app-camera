import { NextResponse } from "next/server";

import { statusSeguro } from "@/app/api/admin/_lib/status-seguro";
import { ApiError, calcularRostoNoNotebook } from "@/lib/api";

/**
 * Troca a foto do formulario de aluno pelo rosto calculado no notebook.
 *
 * Por que existe: a API da nuvem (Render) nao tem insightface, entao cadastrar
 * ou editar aluno COM foto pelo site dava erro 500 desde que ela foi pra nuvem.
 * O notebook calcula o rosto (embedding + miniatura) e esta funcao monta um
 * formulario novo SEM a foto e COM o rosto pronto — e' esse que vai pra nuvem.
 * A foto original so' passa em memoria, como antes.
 *
 * @returns o formulario pronto pra nuvem (o mesmo, se nao veio foto), ou a
 *          resposta de erro que a rota deve devolver direto ao navegador.
 */
export async function trocarFotoPeloRosto(
  form: FormData,
): Promise<FormData | NextResponse> {
  const foto = form.get("foto");
  if (!(foto instanceof File) || foto.size === 0) return form;

  try {
    const rosto = await calcularRostoNoNotebook(foto);
    const pronto = new FormData();
    for (const [campo, valor] of form.entries()) {
      if (campo !== "foto") pronto.append(campo, valor);
    }
    pronto.append("embedding", rosto.embedding);
    pronto.append("thumb", rosto.thumb);
    return pronto;
  } catch (causa) {
    if (!(causa instanceof ApiError)) throw causa;
    if (causa.status === 422) {
      // Foto sem rosto, com 2+ rostos, ilegivel, tipo errado: o detalhe do
      // backend vai cru pro modal, igual quando a nuvem calculava.
      return NextResponse.json(
        { erro: "Não foi possível usar esta foto.", detalhe: causa.detalhe },
        { status: 422 },
      );
    }
    if (causa.status === 413) {
      return NextResponse.json({ erro: "Foto grande demais." }, { status: 413 });
    }
    if (causa.isCameraOffline) {
      return NextResponse.json(
        {
          erro:
            "Para salvar a foto, o computador da sala precisa estar ligado com o CUPCAM aberto — é ele que reconhece o rosto. Sem foto, o cadastro funciona normalmente.",
        },
        { status: 503 },
      );
    }
    return NextResponse.json(
      { erro: "Não foi possível processar a foto no computador da sala." },
      { status: statusSeguro(causa) },
    );
  }
}
