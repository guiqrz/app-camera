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
  Aula,
  AulasDaTurma,
  ChamadaDaSessao,
  ConfirmacaoPresencaResposta,
  EstadoCamera,
  EstatisticasDaTurma,
  Materia,
  ModoCamera,
  ModoCameraInfo,
  NovaAula,
  NovaMateria,
  NovaTurma,
  RelatorioDaSessao,
  Transcricao,
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

export function lerConfiguracao(): { baseUrl: string; apiKey: string } {
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
  method?: "GET" | "POST" | "PUT" | "DELETE";
  /** FormData vai crua (multipart); qualquer outra coisa vira JSON. */
  body?: unknown;
};

async function requisitar<T>(
  rota: string,
  { revalidate = 30, method = "GET", body }: OpcoesRequisicao = {},
): Promise<T> {
  const { baseUrl, apiKey } = lerConfiguracao();

  const eFormData = body instanceof FormData;
  // Escrita (POST/PUT/DELETE) nunca e' cacheada; leitura revalida no intervalo pedido.
  const eEscrita = method === "POST" || method === "PUT" || method === "DELETE";

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

/**
 * Edita um aluno (multipart: nome, turma_id, opcional foto, opcional
 * remover_foto). Repassa o FormData cru — quem monta os campos e' a rota PUT em
 * app/api/admin/alunos/[ra], que recebe o multipart do navegador e encaminha.
 */
export function editarAluno(
  ra: string,
  form: FormData,
): Promise<{ ra: string; nome: string; turma_id: number }> {
  return requisitar<{ ra: string; nome: string; turma_id: number }>(
    `/admin/alunos/${encodeURIComponent(ra)}`,
    { method: "PUT", body: form },
  );
}

/** Edita todos os campos de uma turma. A API recusa com 409 em conflito de horario. */
export function editarTurma(id: number, dados: NovaTurma): Promise<{ id: number }> {
  return requisitar<{ id: number }>(`/admin/turmas/${id}`, {
    method: "PUT",
    body: dados,
  });
}

/** Exclui uma turma. A API recusa com 409 se ela ainda tiver alunos. */
export function excluirTurma(id: number): Promise<{ id: number; nome: string }> {
  return requisitar<{ id: number; nome: string }>(`/admin/turmas/${id}`, {
    method: "DELETE",
  });
}

/* --- Materias --- */
export function listarMaterias(): Promise<Materia[]> {
  return requisitar<Materia[]>("/admin/materias", { revalidate: 0 });
}
export function criarMateria(dados: NovaMateria): Promise<{ id: number }> {
  return requisitar<{ id: number }>("/admin/materias", { method: "POST", body: dados });
}
export function editarMateria(id: number, dados: NovaMateria): Promise<{ id: number }> {
  return requisitar<{ id: number }>(`/admin/materias/${id}`, { method: "PUT", body: dados });
}
export function excluirMateria(id: number): Promise<{ id: number; nome: string }> {
  return requisitar<{ id: number; nome: string }>(`/admin/materias/${id}`, { method: "DELETE" });
}

/* --- Aulas --- */
export function listarAulasDaTurma(turmaId: number): Promise<Aula[]> {
  return requisitar<Aula[]>(`/admin/turmas/${turmaId}/aulas`, { revalidate: 0 });
}
export function criarAula(turmaId: number, dados: NovaAula): Promise<{ id: number }> {
  return requisitar<{ id: number }>(`/admin/turmas/${turmaId}/aulas`, { method: "POST", body: dados });
}
export function editarAula(id: number, dados: NovaAula): Promise<{ id: number }> {
  return requisitar<{ id: number }>(`/admin/aulas/${id}`, { method: "PUT", body: dados });
}
export function excluirAula(id: number): Promise<{ id: number }> {
  return requisitar<{ id: number }>(`/admin/aulas/${id}`, { method: "DELETE" });
}

/* ------------------------------------------------------------------ */
/* Camera                                                              */
/* ------------------------------------------------------------------ */

/** Estado ao vivo da captura. Sempre responde, mesmo com a camera parada. */
export function lerEstadoCamera(): Promise<EstadoCamera> {
  return requisitar<EstadoCamera>("/camera/estado", { revalidate: 0 });
}

/**
 * Liga a captura. Lanca ApiError 409 (via requisitar) se ja houver camera rodando.
 *
 * turmaId opcional: turma escolhida a mao na tela de Camera. Sem ela, o backend
 * escolhe a turma automatico pelo horario.
 *
 * modo opcional: modo inicial da captura. Sem ele, o backend sobe no padrao
 * (Aula) — inclusive quando a camera sobe sozinha por horario.
 *
 * audio opcional: liga o microfone junto, se o professor escolheu isso na
 * tela parada de Camera. Sem ele, o backend decide sozinho via
 * CUPCAM_AUDIO_ATIVO do .env — o mesmo caminho que a camera automatica usa.
 */
export function ligarCamera(
  turmaId?: number,
  modo?: ModoCamera,
  audio?: boolean,
): Promise<{ iniciando: boolean }> {
  const corpo: { turma_id?: number; modo?: ModoCamera; audio?: boolean } = {};
  if (turmaId != null) corpo.turma_id = turmaId;
  if (modo != null) corpo.modo = modo;
  if (audio != null) corpo.audio = audio;
  return requisitar<{ iniciando: boolean }>("/camera/ligar", {
    method: "POST",
    // Sem nada escolhido, manda POST sem corpo: e' o caminho automatico.
    body: Object.keys(corpo).length > 0 ? corpo : undefined,
  });
}

/** Para a captura. Idempotente no backend. */
export function desligarCamera(): Promise<{ parado: boolean }> {
  return requisitar<{ parado: boolean }>("/camera/desligar", { method: "POST" });
}

/**
 * Modos disponiveis, com rotulo, resumo, detalhe e cor.
 *
 * Os textos vem do backend (cupcam/modos.py) em vez de ficarem escritos aqui
 * pra descricao e comportamento nunca divergirem: quem decide o que cada modo
 * liga e' o mesmo arquivo que descreve o que ele faz. A `cor` vem junto pelo
 * mesmo motivo — e' identidade do modo, nao decoracao desta tela.
 */
export function listarModosCamera(): Promise<{
  padrao: ModoCamera;
  modos: ModoCameraInfo[];
}> {
  return requisitar<{ padrao: ModoCamera; modos: ModoCameraInfo[] }>("/camera/modos");
}

/**
 * Pede a troca de modo com a camera rodando.
 *
 * `aplicando: true` significa "comando aceito", nao "ja valeu": o backend le o
 * pedido no proximo ciclo, entao quem confirma a troca e' o `modo` do
 * /camera/estado, alguns segundos depois.
 */
export function trocarModoCamera(modo: ModoCamera): Promise<{
  modo: ModoCamera;
  aplicando: boolean;
}> {
  return requisitar<{ modo: ModoCamera; aplicando: boolean }>("/camera/modo", {
    method: "POST",
    body: { modo },
  });
}

/**
 * Se o microfone esta ligado no comando pendente.
 *
 * Atencao: isto e' o COMANDO, nao a gravacao. Quem confirma que a captura
 * comecou de fato e' `audio_ativo` no /camera/estado — e' esse que a tela usa
 * pro aviso "gravando", justamente pra nunca dizer que grava antes de gravar.
 */
export function lerAudioCamera(): Promise<{ ativo: boolean }> {
  return requisitar<{ ativo: boolean }>("/camera/audio", { revalidate: 0 });
}

/**
 * Liga/desliga a gravacao de audio da aula.
 *
 * Como a troca de modo, o backend le o comando uma vez por ciclo — entao a
 * resposta significa "comando gravado", e a confirmacao vem pelo polling.
 */
export function trocarAudioCamera(ativo: boolean): Promise<{ ativo: boolean }> {
  return requisitar<{ ativo: boolean }>("/camera/audio", {
    method: "POST",
    body: { ativo },
  });
}

/* ------------------------------------------------------------------ */
/* Transcricao                                                         */
/* ------------------------------------------------------------------ */

/** Transcricao da aula. Lanca ApiError 404 quando a aula nao tem audio. */
export function buscarTranscricao(sessaoId: number): Promise<Transcricao> {
  return requisitar<Transcricao>(`/sessoes/${sessaoId}/transcricao`, { revalidate: 0 });
}

/**
 * Pede uma nova tentativa de transcricao.
 *
 * Lanca ApiError 404 (sem audio guardado) ou 409 (ja esta transcrevendo).
 */
export function reprocessarTranscricao(
  sessaoId: number,
): Promise<{ reprocessando: boolean }> {
  return requisitar<{ reprocessando: boolean }>(
    `/sessoes/${sessaoId}/transcricao/reprocessar`,
    { method: "POST" },
  );
}

/**
 * Apaga o audio da aula a pedido do professor. Devolve quantos arquivos sairam.
 *
 * Apaga TODOS os trechos da sessao (o microfone pode ter sido religado no meio
 * da aula), e nunca toca na transcricao — o texto continua la'.
 *
 * Lanca ApiError 404 quando nao ha audio guardado.
 */
export function excluirAudioDaSessao(
  sessaoId: number,
): Promise<{ apagados: number }> {
  return requisitar<{ apagados: number }>(`/sessoes/${sessaoId}/audio`, {
    method: "DELETE",
  });
}
