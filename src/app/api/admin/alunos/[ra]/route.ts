import { NextResponse } from "next/server";

import { statusSeguro } from "@/app/api/admin/_lib/status-seguro";
import { ApiError, editarAluno, excluirAluno, mudarTurmaDoAluno } from "@/lib/api";

/**
 * Ponte de escrita "Mudar turma" e "Excluir aluno" da tela "Administracao".
 *
 * O navegador chama AQUI (POST/DELETE /api/admin/alunos/{ra}), e esta rota,
 * rodando no servidor, repassa para a API do CUPCAM com a X-API-Key. Mesmo
 * motivo das outras pontes: "use client" nao pode importar lib/api.ts
 * (server-only).
 */

type Params = {
  params: Promise<{ ra: string }>;
};

/** POST /api/admin/alunos/{ra} — move o aluno para outra turma. */
export async function POST(requisicao: Request, { params }: Params) {
  const { ra } = await params;
  if (!ra.trim()) {
    return NextResponse.json({ erro: "RA inválido." }, { status: 400 });
  }

  // Corpo esperado: { turma_id: number }. Qualquer outra coisa e' 400.
  let turmaId: unknown;
  try {
    ({ turma_id: turmaId } = await requisicao.json());
  } catch {
    return NextResponse.json(
      { erro: "Corpo da requisição inválido." },
      { status: 400 },
    );
  }
  if (typeof turmaId !== "number" || !Number.isInteger(turmaId)) {
    return NextResponse.json(
      { erro: "Campo 'turma_id' deve ser um número inteiro." },
      { status: 400 },
    );
  }

  try {
    const resposta = await mudarTurmaDoAluno(ra, turmaId);
    return NextResponse.json(resposta);
  } catch (causa) {
    if (causa instanceof ApiError) {
      if (causa.isNotFound) {
        return NextResponse.json(
          { erro: "Aluno ou turma não encontrado." },
          { status: 404 },
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

/**
 * PUT /api/admin/alunos/{ra} — edita nome/turma/foto do aluno (multipart cru).
 *
 * O corpo e' o mesmo FormData que o navegador montou (nome, turma_id, e
 * opcionalmente foto ou remover_foto); esta rota so' repassa pra API do CUPCAM.
 */
export async function PUT(requisicao: Request, { params }: Params) {
  const { ra } = await params;
  if (!ra.trim()) {
    return NextResponse.json({ erro: "RA inválido." }, { status: 400 });
  }

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
    const resposta = await editarAluno(ra, form);
    return NextResponse.json(resposta);
  } catch (causa) {
    if (causa instanceof ApiError) {
      if (causa.isNotFound) {
        return NextResponse.json(
          { erro: "Aluno ou turma não encontrado." },
          { status: 404 },
        );
      }
      if (causa.status === 422) {
        // Foto ilegivel, sem rosto ou com 2+ rostos: o detalhe ({detail: string})
        // vai cru pro modal explicar ao usuario o que houve com a foto.
        return NextResponse.json(
          { erro: "Não foi possível processar a foto.", detalhe: causa.detalhe },
          { status: 422 },
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

/** DELETE /api/admin/alunos/{ra}?confirmar_historico= — exclui o aluno. */
export async function DELETE(requisicao: Request, { params }: Params) {
  const { ra } = await params;
  if (!ra.trim()) {
    return NextResponse.json({ erro: "RA inválido." }, { status: 400 });
  }

  const url = new URL(requisicao.url);
  const confirmarHistorico = url.searchParams.get("confirmar_historico") === "true";

  try {
    const resposta = await excluirAluno(ra, confirmarHistorico);
    return NextResponse.json(resposta);
  } catch (causa) {
    if (causa instanceof ApiError) {
      if (causa.isNotFound) {
        return NextResponse.json(
          { erro: "Aluno não encontrado." },
          { status: 404 },
        );
      }
      if (causa.status === 409) {
        // Aluno tem historico de presenca. O detalhe estruturado
        // ({detail: {nome, total_registros}}) vai cru pro modal de exclusao
        // montar a mensagem de confirmacao.
        return NextResponse.json(
          {
            erro: "Aluno tem histórico de presença.",
            detalhe: causa.detalhe,
          },
          { status: 409 },
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
