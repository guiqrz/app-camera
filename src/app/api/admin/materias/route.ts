import { NextResponse } from "next/server";

import { statusSeguro } from "@/app/api/admin/_lib/status-seguro";
import { validarNovaMateria } from "@/app/api/admin/_lib/validar-materia";
import { ApiError, criarMateria, listarMaterias } from "@/lib/api";

/**
 * Ponte de "Materias" da tela "Coordenacao": listar (GET) e cadastrar (POST).
 *
 * O navegador chama AQUI (/api/admin/materias), e esta rota, rodando no
 * servidor, repassa pra API do CUPCAM com a X-API-Key. Mesmo motivo das outras
 * pontes: "use client" nao pode importar lib/api.ts (server-only), entao a
 * chave nunca aparece no JavaScript do usuario.
 */

// Forca a rota a rodar por requisicao. listarMaterias ja usa revalidate: 0 em
// lib/api.ts, mas isso fica dois arquivos de distancia — explicitar aqui
// imuniza contra um refactor futuro que mude o cache de la' sem perceber que
// esta rota dependia disso.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const materias = await listarMaterias();
    return NextResponse.json(materias);
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

export async function POST(requisicao: Request) {
  // Corpo esperado: NovaMateria. Qualquer outra coisa e' 400 antes de bater na API.
  let dados: unknown;
  try {
    dados = await requisicao.json();
  } catch {
    return NextResponse.json(
      { erro: "Corpo da requisição inválido." },
      { status: 400 },
    );
  }

  if (!validarNovaMateria(dados)) {
    return NextResponse.json(
      { erro: "Dados da matéria incompletos ou inválidos." },
      { status: 400 },
    );
  }

  try {
    const criada = await criarMateria(dados);
    return NextResponse.json(criada, { status: 201 });
  } catch (causa) {
    if (causa instanceof ApiError) {
      if (causa.status === 422) {
        // Validacao da API (nome vazio ou ja cadastrado). O detalhe vem
        // estruturado ({detail: string}) — repassa cru pro modal mostrar a
        // mensagem exata.
        return NextResponse.json(
          { erro: "Não foi possível criar a matéria.", detalhe: causa.detalhe },
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

