import { NextResponse } from "next/server";

import { statusSeguro } from "@/app/api/admin/_lib/status-seguro";
import { ApiError, criarAula, listarAulasDaTurma } from "@/lib/api";
import type { NovaAula } from "@/lib/types";

/**
 * Ponte da grade de aulas de uma turma na tela "Coordenacao": listar (GET) e
 * cadastrar (POST). O navegador chama AQUI; esta rota, no servidor, repassa
 * pra API do CUPCAM com a X-API-Key. Mesmo motivo das outras pontes: "use
 * client" nao pode importar lib/api.ts (server-only).
 */
type Params = { params: Promise<{ id: string }> };

// Forca a rota a rodar por requisicao. listarAulasDaTurma ja usa revalidate: 0
// em lib/api.ts, mas isso fica dois arquivos de distancia — explicitar aqui
// imuniza contra um refactor futuro que mude o cache de la'.
export const dynamic = "force-dynamic";

function idValido(bruto: string): number | null {
  const n = Number(bruto);
  return Number.isInteger(n) && n > 0 ? n : null;
}

/**
 * Valida o corpo de POST/PUT de aula.
 *
 * De proposito NAO valida o formato HH:MM das horas: quem normaliza e valida
 * horario (formato, fim antes do inicio, virada de meia-noite) e' o backend,
 * em gestao/aulas.py. Duplicar a regra aqui criaria duas fontes da verdade que
 * divergem com o tempo — a checagem e' so' "string nao vazia", e o 422 do
 * backend flui ate a tela com a mensagem exata.
 *
 * `materia_id` ausente e' aceito e repassado como ausente: o backend trata
 * omissao como "limpar a materia" (PUT e' substituicao total do recurso), e o
 * proxy nao pode inventar um default diferente do que o cliente mandou.
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

export async function GET(_requisicao: Request, { params }: Params) {
  const { id } = await params;
  const idNum = idValido(id);
  if (idNum === null) {
    return NextResponse.json({ erro: "ID de turma inválido." }, { status: 400 });
  }

  try {
    // Turma sem grade montada devolve lista vazia — nao e' 404.
    const aulas = await listarAulasDaTurma(idNum);
    return NextResponse.json(aulas);
  } catch (causa) {
    if (causa instanceof ApiError) {
      return NextResponse.json(
        { erro: "Não foi possível falar com a API do CUPCAM. Tente novamente em instantes." },
        { status: statusSeguro(causa) },
      );
    }
    throw causa;
  }
}

export async function POST(requisicao: Request, { params }: Params) {
  const { id } = await params;
  const idNum = idValido(id);
  if (idNum === null) {
    return NextResponse.json({ erro: "ID de turma inválido." }, { status: 400 });
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
    const criada = await criarAula(idNum, dados);
    return NextResponse.json(criada, { status: 201 });
  } catch (causa) {
    if (causa instanceof ApiError) {
      if (causa.status === 409) {
        // Conflito de horario: outra turma ja ocupa a mesma sala/dia nesse
        // intervalo. O detalhe ({detail: {nome}}) vai cru pro modal apontar
        // com qual turma o horario colide.
        return NextResponse.json(
          { erro: "Conflito de horário com outra turma.", detalhe: causa.detalhe },
          { status: 409 },
        );
      }
      if (causa.status === 422) {
        // Validacao da API: horario invalido, fim antes do inicio, dia fora da
        // faixa, ou turma/materia inexistente. O detalhe ({detail: string})
        // vai cru pro modal mostrar a mensagem exata.
        return NextResponse.json(
          { erro: "Não foi possível criar a aula.", detalhe: causa.detalhe },
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
