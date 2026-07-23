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
  AlunoAdmin,
  AulasDaTurma,
  ChamadaDaSessao,
  ConfirmacaoPresencaResposta,
  EstatisticasDaTurma,
  NovaTurma,
  RelatorioDaSessao,
  Turma,
  VisaoAdmin,
} from "./types";

/** Erro de comunicacao com a API, com o status HTTP preservado. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly rota: string,
    /**
     * Corpo de erro ja parseado, quando a API respondeu JSON (ex.: 422
     * `{detail: string}` ou 409 `{detail: {nome, total_registros}}`).
     * As rotas de admin usam este campo para repassar o detalhe estruturado
     * pro navegador; quando a resposta nao era JSON, fica undefined.
     */
    readonly detalhe?: unknown,
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
  method?: "GET" | "POST" | "DELETE";
  /** FormData vai crua (multipart); qualquer outra coisa vira JSON. */
  body?: unknown;
};

async function requisitar<T>(
  rota: string,
  { revalidate = 30, method = "GET", body }: OpcoesRequisicao = {},
): Promise<T> {
  const { baseUrl, apiKey } = lerConfiguracao();

  const eFormData = body instanceof FormData;
  // Escrita (POST/DELETE) nunca e' cacheada; leitura revalida no intervalo pedido.
  const eEscrita = method === "POST" || method === "DELETE";

  let resposta: Response;
  try {
    resposta = await fetch(`${baseUrl}${rota}`, {
      method,
      headers: {
        "X-API-Key": apiKey,
        // FormData: NAO setar Content-Type manualmente — o fetch monta o
        // boundary do multipart sozinho. Setar aqui quebra o parse no backend.
        ...(body && !eFormData ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? (eFormData ? body : JSON.stringify(body)) : undefined,
      next: eEscrita ? undefined : { revalidate },
      cache: eEscrita ? "no-store" : undefined,
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
    // A API costuma responder JSON com {detail: ...} em erros de validacao
    // (422) e conflito (409). Tenta parsear para preservar a estrutura;
    // cai pro texto cru quando a resposta nao e' JSON.
    const bruto = await resposta.text().catch(() => "");
    let detalhe: unknown;
    try {
      detalhe = bruto ? JSON.parse(bruto) : undefined;
    } catch {
      detalhe = undefined;
    }
    throw new ApiError(
      `API respondeu ${resposta.status} em ${rota}. ${bruto}`.trim(),
      resposta.status,
      rota,
      detalhe,
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

/* ------------------------------------------------------------------ */
/* Administracao                                                      */
/* ------------------------------------------------------------------ */

/**
 * Tela "Administracao" — turmas, alunos e totais.
 *
 * Sem cache: quem administra precisa ver o dado fresco assim que cadastra
 * ou move alguem, sem esperar a janela de revalidacao.
 */
export function buscarVisaoAdmin(): Promise<VisaoAdmin> {
  return requisitar<VisaoAdmin>("/admin/visao", { revalidate: 0 });
}

/** Cria uma turma nova. */
export function criarTurma(dados: NovaTurma): Promise<{ id: number }> {
  return requisitar<{ id: number }>("/admin/turmas", {
    method: "POST",
    body: dados,
  });
}

/**
 * Cadastra um aluno com foto (multipart: foto, ra, nome, turma_id).
 *
 * Repassa o FormData cru — quem monta os campos e' o chamador (a rota em
 * app/api/admin/alunos, que recebe o multipart do navegador e so encaminha).
 */
export function criarAluno(
  form: FormData,
): Promise<{ ra: string; nome: string; turma_id: number }> {
  return requisitar<{ ra: string; nome: string; turma_id: number }>(
    "/admin/alunos",
    { method: "POST", body: form },
  );
}

/** Move um aluno para outra turma. */
export function mudarTurmaDoAluno(
  ra: string,
  turmaId: number,
): Promise<{
  ra: string;
  nome: string;
  turma_anterior: number;
  turma_id: number;
}> {
  return requisitar<{
    ra: string;
    nome: string;
    turma_anterior: number;
    turma_id: number;
  }>(`/admin/alunos/${encodeURIComponent(ra)}/turma`, {
    method: "POST",
    body: { turma_id: turmaId },
  });
}

/**
 * Exclui um aluno. Sem `confirmarHistorico`, a API recusa (409) quando ha
 * historico de presenca — o chamador reenvia com `true` apos o usuario
 * confirmar no modal.
 */
export function excluirAluno(
  ra: string,
  confirmarHistorico: boolean,
): Promise<Pick<AlunoAdmin, "ra" | "nome">> {
  const query = confirmarHistorico ? "?confirmar_historico=true" : "";
  return requisitar<Pick<AlunoAdmin, "ra" | "nome">>(
    `/admin/alunos/${encodeURIComponent(ra)}${query}`,
    { method: "DELETE" },
  );
}
