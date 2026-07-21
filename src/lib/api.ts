/**
 * Cliente HTTP da API do CUPCAM.
 *
 * SEGURANCA — leia antes de mexer:
 *
 * A API fica exposta na internet publica (tunel cloudflared) e serve nome e
 * RA de alunos. A unica coisa que impede qualquer pessoa com a URL de ler
 * esse dado pessoal e' a chave em CUPCAM_API_KEY.
 *
 * Por isso este modulo importa "server-only": se algum componente de
 * navegador ("use client") importar este arquivo, o build QUEBRA de proposito,
 * em vez de embutir a chave silenciosamente no JavaScript enviado ao usuario.
 *
 * Regra pratica: componentes de navegador nunca chamam estas funcoes. Eles
 * falam com nossas proprias rotas em src/app/api/, que rodam no servidor e
 * chamam daqui.
 */

import "server-only";

import type {
  AulasDaTurma,
  ChamadaDaSessao,
  ConfirmacaoPresencaResposta,
  EstatisticasDaTurma,
  RelatorioDaSessao,
  Turma,
} from "./types";

/** Erro de comunicacao com a API, com o status HTTP preservado. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly rota: string,
  ) {
    super(message);
    this.name = "ApiError";
  }

  /** Recurso inexistente — a tela deve mostrar "nao encontrado", nao erro. */
  get isNotFound(): boolean {
    return this.status === 404;
  }
}

function lerConfiguracao(): { baseUrl: string; apiKey: string } {
  const baseUrl = process.env.CUPCAM_API_URL;
  const apiKey = process.env.CUPCAM_API_KEY;

  // Falha cedo e com mensagem clara: sem isso o sintoma seria um 401
  // generico em toda tela, dificil de rastrear ate a variavel faltando.
  if (!baseUrl) {
    throw new Error(
      "CUPCAM_API_URL nao esta definida. Copie .env.example para .env.local.",
    );
  }
  if (!apiKey) {
    throw new Error(
      "CUPCAM_API_KEY nao esta definida. Copie .env.example para .env.local.",
    );
  }

  return { baseUrl: baseUrl.replace(/\/$/, ""), apiKey };
}

type OpcoesRequisicao = {
  /** Segundos ate revalidar o cache. 0 desliga o cache (dado ao vivo). */
  revalidate?: number;
  method?: "GET" | "POST";
  body?: unknown;
};

async function requisitar<T>(
  rota: string,
  { revalidate = 30, method = "GET", body }: OpcoesRequisicao = {},
): Promise<T> {
  const { baseUrl, apiKey } = lerConfiguracao();

  let resposta: Response;
  try {
    resposta = await fetch(`${baseUrl}${rota}`, {
      method,
      headers: {
        "X-API-Key": apiKey,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      // Escrita nunca e' cacheada; leitura revalida no intervalo pedido.
      next: method === "POST" ? undefined : { revalidate },
      cache: method === "POST" ? "no-store" : undefined,
    });
  } catch {
    // Rede fora do ar, tunel caido ou notebook desligado.
    throw new ApiError(
      "Nao foi possivel falar com a API do CUPCAM. O notebook e o tunel estao ligados?",
      0,
      rota,
    );
  }

  if (!resposta.ok) {
    const detalhe = await resposta.text().catch(() => "");
    throw new ApiError(
      `API respondeu ${resposta.status} em ${rota}. ${detalhe}`.trim(),
      resposta.status,
      rota,
    );
  }

  return (await resposta.json()) as T;
}

/* ------------------------------------------------------------------ */
/* Leitura                                                             */
/* ------------------------------------------------------------------ */

/** Todas as turmas — alimenta o seletor de turma. */
export function listarTurmas(): Promise<Turma[]> {
  // Turmas mudam raramente; cache mais longo evita ida a rede a cada tela.
  return requisitar<Turma[]>("/turmas", { revalidate: 300 });
}

/** Tela "Minhas Aulas". */
export function buscarAulasDaTurma(turmaId: number): Promise<AulasDaTurma> {
  return requisitar<AulasDaTurma>(`/turmas/${turmaId}/aulas`);
}

/** Tela "Relatorio" — visao completa de uma aula. */
export function buscarRelatorio(sessaoId: number): Promise<RelatorioDaSessao> {
  return requisitar<RelatorioDaSessao>(`/sessoes/${sessaoId}/relatorio`);
}

/**
 * Tela "Fazer Chamada".
 *
 * Sem cache: o professor marca presenca e precisa ver o proprio clique
 * refletido na hora. Dado velho aqui seria confuso.
 */
export function buscarChamada(sessaoId: number): Promise<ChamadaDaSessao> {
  return requisitar<ChamadaDaSessao>(`/sessoes/${sessaoId}/chamada`, {
    revalidate: 0,
  });
}

/** Painel "Fontes de dados" da tela de I.A. */
export function buscarEstatisticasDaTurma(
  turmaId: number,
): Promise<EstatisticasDaTurma> {
  return requisitar<EstatisticasDaTurma>(`/turmas/${turmaId}/estatisticas`);
}

/* ------------------------------------------------------------------ */
/* Escrita                                                             */
/* ------------------------------------------------------------------ */

/** Professor confirma ou corrige a presenca de um aluno. Unica escrita. */
export function confirmarPresenca(
  sessaoId: number,
  ra: string,
  presente: boolean,
): Promise<ConfirmacaoPresencaResposta> {
  return requisitar<ConfirmacaoPresencaResposta>(
    `/sessoes/${sessaoId}/chamada/${encodeURIComponent(ra)}/confirmar`,
    { method: "POST", body: { presente } },
  );
}
