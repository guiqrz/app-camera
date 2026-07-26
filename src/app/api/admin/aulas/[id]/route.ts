import { NextResponse } from "next/server";

import { statusSeguro } from "@/app/api/admin/_lib/status-seguro";
import { ApiError, editarAula, excluirAula } from "@/lib/api";
import type { NovaAula } from "@/lib/types";

/**
 * Ponte de "Editar aula" (PUT) e "Excluir aula" (DELETE) da grade da tela
 * "Coordenacao". O navegador chama AQUI; esta rota, no servidor, repassa pra
 * API do CUPCAM com a X-API-Key. Mesmo motivo das outras pontes: "use client"
 * nao pode importar lib/api.ts (server-only).
 */
type Params = { params: Promise<{ id: string }> };

function idValido(bruto: string): number | null {
  const n = Number(bruto);
  return Number.isInteger(n) && n > 0 ? n : null;
}

/**
 * Valida o corpo de PUT de aula (mesmas regras do POST em
 * `turmas/[id]/aulas/route.ts`).
 *
 * De proposito NAO valida o formato HH:MM das horas: quem normaliza e valida
 * horario (formato, fim antes do inicio, virada de meia-noite) e' o backend,
 * em gestao/aulas.py. Duplicar a regra aqui criaria duas fontes da verdade que
 * divergem com o tempo — a checagem e' so' "string nao vazia", e o 422 do
 * backend flui ate a tela com a mensagem exata.
 *
 * `materia_id` ausente e' aceito e repassado como ausente: o PUT do backend e'
 * substituicao TOTAL do recurso, entao omitir materia_id LIMPA a materia da
 * aula (comportamento intencional, coberto por teste la'). O proxy nao pode
 * inventar um default diferente do que o cliente mandou.
 */
function validarNovaAula(dados: unknown): dados is NovaAula {
  if (typeof dados !== "object" || dados === null) return false;
  const d = dados as Record<string, unknown>;
  const materiaValida =
    d.materia_id === undefined ||
    d.materia_id === null ||
    (typeof d.materia_id === "number" && Number.isInteger(d.materia_id) && d.materia_id > 0);
  return (
    typeof d.dia_semana === "number" &&
    Number.isInteger(d.dia_semana) &&
    d.dia_semana >= 0 &&
    d.dia_semana <= 6 &&
    typeof d.hora_inicio === "string" &&
    d.hora_inicio.trim() !== "" &&
    typeof d.hora_fim === "string" &&
    d.hora_fim.trim() !== "" &&
    materiaValida
  );
}

export async function PUT(requisicao: Request, { params }: Params) {
  const { id } = await params;
  const idNum = idValido(id);
  if (idNum === null) {
    return NextResponse.json({ erro: "ID de aula inválido." }, { status: 400 });
  }

  let dados: unknown;
  try {
    dados = await requisicao.json();
  } catch {
    return NextResponse.json(
      { erro: "Corpo da requisição inválido." },
      { status: 400 },
    );
  }
  if (!validarNovaAula(dados)) {
    return NextResponse.json(
      { erro: "Dados da aula incompletos ou inválidos." },
      { status: 400 },
    );
  }

  try {
    const resposta = await editarAula(idNum, dados);
    return NextResponse.json(resposta);
  } catch (causa) {
    if (causa instanceof ApiError) {
      if (causa.isNotFound) {
        // 404 aqui e' SO' "a aula nao existe". Materia inexistente e' um caso
        // diferente e vem como 422 (ramo abaixo) — nao colapsar os dois, a
        // mensagem que a tela mostra muda conforme qual dos dois foi.
        return NextResponse.json({ erro: "Aula não encontrada." }, { status: 404 });
      }
      if (causa.status === 409) {
        // Conflito de horario: {detail: {nome}} vai cru pro modal exibir com
        // qual turma o novo horario colide.
        return NextResponse.json(
          { erro: "Conflito de horário com outra turma.", detalhe: causa.detalhe },
          { status: 409 },
        );
      }
      if (causa.status === 422) {
        // Validacao da API: dia fora da faixa, horario invalido, fim antes do
        // inicio, ou materia_id inexistente. O detalhe ({detail: string}) vai
        // cru pro modal dizer qual foi.
        return NextResponse.json(
          { erro: "Não foi possível editar a aula.", detalhe: causa.detalhe },
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

export async function DELETE(_requisicao: Request, { params }: Params) {
  const { id } = await params;
  const idNum = idValido(id);
  if (idNum === null) {
    return NextResponse.json({ erro: "ID de aula inválido." }, { status: 400 });
  }

  try {
    // As sessoes que rodaram nessa aula nao somem — so' perdem o vinculo
    // (aula_id vira NULL no backend). Chamada e engajamento continuam.
    const resposta = await excluirAula(idNum);
    return NextResponse.json(resposta);
  } catch (causa) {
    if (causa instanceof ApiError) {
      if (causa.isNotFound) {
        return NextResponse.json({ erro: "Aula não encontrada." }, { status: 404 });
      }
      return NextResponse.json(
        { erro: "Não foi possível falar com a API do CUPCAM. Tente novamente em instantes." },
        { status: statusSeguro(causa) },
      );
    }
    throw causa;
  }
}
