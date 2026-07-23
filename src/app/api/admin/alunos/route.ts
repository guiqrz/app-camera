import { NextResponse } from "next/server";

import { statusSeguro } from "@/app/api/admin/_lib/status-seguro";
import { ApiError, criarAluno } from "@/lib/api";

/**
 * Ponte de escrita "Novo aluno" da tela "Administracao".
 *
 * O navegador chama AQUI (POST /api/admin/alunos) com multipart/form-data
 * (foto, ra, nome, turma_id), e esta rota, rodando no servidor, repassa o
 * FormData cru para a API do CUPCAM com a X-API-Key. Mesmo motivo das
 * outras pontes: "use client" nao pode importar lib/api.ts (server-only).
 */

export async function POST(requisicao: Request) {
  // Le como FormData e repassa cru — validacao de rosto/tipo/tamanho de
  // arquivo e' responsabilidade da API, nao desta ponte.
  let form: FormData;
  try {
    form = await requisicao.formData();
  } catch {
    return NextResponse.json(
      { erro: "Corpo da requisição inválido." },
      { status: 400 },
    );
  }

  try {
    const criado = await criarAluno(form);
    return NextResponse.json(criado, { status: 201 });
  } catch (causa) {
    if (causa instanceof ApiError) {
      if (causa.status === 422) {
        // Ex.: foto sem rosto, foto com 2+ rostos, foto ilegivel, tipo ou
        // tamanho invalido. O detalhe ({detail: string}) vai cru pro modal.
        return NextResponse.json(
          { erro: "Não foi possível cadastrar o aluno.", detalhe: causa.detalhe },
          { status: 422 },
        );
      }
      if (causa.isNotFound) {
        return NextResponse.json(
          { erro: "Turma não encontrada." },
          { status: 404 },
        );
      }
      if (causa.status === 413) {
        return NextResponse.json(
          { erro: "Foto grande demais." },
          { status: 413 },
        );
      }
      return NextResponse.json(
        { erro: "Não foi possível falar com a API do CUPCAM. Tente novamente em instantes." },
        { status: statusSeguro(causa) },
      );
    }
    throw causa;
  }
}
