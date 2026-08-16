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
  ConfiguracaoIA,
  ConfirmacaoPresencaResposta,
  ContinuidadeDaTurma,
  ConteudoDaAula,
  Conversa,
  DiaDaSemana,
  DiarioDaAula,
  EstadoCamera,
  EstatisticasDaTurma,
  Lembrete,
  LembreteEditado,
  Lousa,
  Materia,
  ModoCamera,
  ModoCameraInfo,
  NovaAula,
  NovaMateria,
  NovaTurma,
  RelatorioDaSessao,
  RespostaDoAssistente,
  Transcricao,
  Turma,
  PanoramaCoordenacao,
  VisaoAdmin,
  VisaoGeral,
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
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  /** FormData vai crua (multipart); qualquer outra coisa vira JSON. */
  body?: unknown;
};

async function requisitar<T>(
  rota: string,
  { revalidate = 30, method = "GET", body }: OpcoesRequisicao = {},
): Promise<T> {
  const { baseUrl, apiKey } = lerConfiguracao();

  const eFormData = body instanceof FormData;
  // Escrita nunca e' cacheada; leitura revalida no intervalo pedido. PATCH
  // precisa estar nesta lista: fora dela ele cairia no ramo de leitura e o
  // Next tentaria cachear uma escrita.
  const eEscrita =
    method === "POST" ||
    method === "PUT" ||
    method === "PATCH" ||
    method === "DELETE";

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

/**
 * Tela "Minhas Aulas", estado "Todas as turmas" — rota gorda.
 *
 * Devolve numeros + agenda da semana + lembretes numa requisicao so'.
 *
 * Sem cache: o professor marca um lembrete como feito e precisa ver o proprio
 * clique refletido ao voltar pra tela. Cachear aqui traria de volta o lembrete
 * que ele acabou de riscar.
 */
export function buscarVisaoGeral(): Promise<VisaoGeral> {
  return requisitar<VisaoGeral>("/visao-geral", { revalidate: 0 });
}

/**
 * Agenda semanal de UMA turma — o mesmo bloco "Sua semana" no estado turma.
 *
 * Turma sem grade devolve os 7 dias vazios, nunca 404: a turma pode existir
 * antes de a grade ser montada.
 */
export function buscarSemanaDaTurma(turmaId: number): Promise<DiaDaSemana[]> {
  return requisitar<DiaDaSemana[]>(`/turmas/${turmaId}/semana`, {
    revalidate: 0,
  });
}

/* --- Lembretes ---------------------------------------------------------- */

export function listarLembretes(): Promise<Lembrete[]> {
  return requisitar<Lembrete[]>("/lembretes", { revalidate: 0 });
}

export function criarLembrete(corpo: {
  texto: string;
  data: string | null;
}): Promise<{ id: number }> {
  return requisitar<{ id: number }>("/lembretes", {
    method: "POST",
    body: corpo,
  });
}

/**
 * Altera SO' os campos presentes em `corpo` (semantica de PATCH).
 *
 * O `body` e' repassado como veio: omitir `data` mantem o prazo, mandar
 * `data: null` o APAGA. Nao normalize o objeto aqui (nada de `data: corpo.data
 * ?? null`) — isso apagaria o prazo de todo lembrete marcado como feito.
 */
export function editarLembrete(
  id: number,
  corpo: LembreteEditado,
): Promise<{ id: number }> {
  return requisitar<{ id: number }>(`/lembretes/${id}`, {
    method: "PATCH",
    body: corpo,
  });
}

export function removerLembrete(id: number): Promise<{ id: number }> {
  return requisitar<{ id: number }>(`/lembretes/${id}`, { method: "DELETE" });
}

/* --- Plano e anexo da aula ---------------------------------------------- */

/** Grava o plano da aula. Texto vazio LIMPA o plano (nao ha DELETE de plano). */
export function definirPlanoDaAula(
  aulaId: number,
  texto: string,
): Promise<{ id: number }> {
  return requisitar<{ id: number }>(`/admin/aulas/${aulaId}/plano`, {
    method: "PUT",
    body: { texto },
  });
}

/** Guarda (ou SUBSTITUI) o anexo da aula — um anexo por aula. */
export function salvarAnexoDaAula(
  aulaId: number,
  arquivo: FormData,
): Promise<{ id: number; nome: string; tamanho: number }> {
  return requisitar(`/admin/aulas/${aulaId}/anexo`, {
    method: "PUT",
    body: arquivo,
  });
}

export function removerAnexoDaAula(aulaId: number): Promise<{ id: number }> {
  return requisitar<{ id: number }>(`/admin/aulas/${aulaId}/anexo`, {
    method: "DELETE",
  });
}

/**
 * Tela "Minhas Aulas".
 *
 * Sem cache: a lista muda a cada aula dada, e uma aula EM ANDAMENTO precisa
 * parar de ser mostrada como ao vivo assim que encerra. Com os 30s do padrao o
 * card ficava afirmando "em andamento" depois do fim da aula (visto em
 * 31/07/2026).
 */
export function buscarAulasDaTurma(turmaId: number): Promise<AulasDaTurma> {
  return requisitar<AulasDaTurma>(`/turmas/${turmaId}/aulas`, { revalidate: 0 });
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

/**
 * Tela "Coordenacao" — panorama de cadastro da escola.
 *
 * Complementa `buscarVisaoAdmin`: aquela traz o cadastro editavel (com RA e
 * nome, que a tela edita), esta traz os agregados por turma e a lista do que
 * falta configurar. Sao rotas separadas de proposito — o panorama nao expoe
 * aluno nenhum.
 *
 * Sem cache pelo mesmo motivo da visao: cadastrou, tem que aparecer.
 */
export function buscarPanoramaCoordenacao(): Promise<PanoramaCoordenacao> {
  return requisitar<PanoramaCoordenacao>("/admin/panorama", { revalidate: 0 });
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
/* Lousa (modo Lousa)                                                  */
/* ------------------------------------------------------------------ */

/**
 * Pede a captura do quadro. Serve tanto o "Capturar" quanto o "Ler de novo".
 *
 * `capturando: true` significa "pedido registrado", nao "foto pronta": quem
 * captura e' o processo da camera, no proximo ciclo (~1s). A tela busca as
 * lousas logo depois pra ver a nova.
 *
 * Lanca ApiError 409 quando a camera esta parada ou fora do modo Lousa —
 * guardar imagem so' e' autorizado nesse modo.
 */
export function capturarLousa(): Promise<{ pedido: string; capturando: boolean }> {
  return requisitar<{ pedido: string; capturando: boolean }>(
    "/camera/lousa/capturar",
    { method: "POST" },
  );
}

/**
 * Lousas da aula, com o texto lido do quadro.
 *
 * A leitura pelo Gemini acontece DENTRO desta chamada, no backend, pro que
 * estiver pendente — por isso pode demorar alguns segundos na primeira vez.
 * Sem imagem no corpo: cada JPEG vem pela rota propria.
 */
export function listarLousas(sessaoId: number): Promise<{ lousas: Lousa[] }> {
  return requisitar<{ lousas: Lousa[] }>(`/sessoes/${sessaoId}/lousas`, {
    revalidate: 0,
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

/* ------------------------------------------------------------------ */
/* Cup AI                                                              */
/* ------------------------------------------------------------------ */

/** Conversas do professor, da mais recente pra mais antiga. Sem mensagens. */
export function listarConversas(): Promise<Conversa[]> {
  // Sem cache: o professor acabou de perguntar e volta pra lista — 30s de
  // cache mostrariam a conversa com o titulo e a data velhos.
  return requisitar<Conversa[]>("/ia/conversas", { revalidate: 0 });
}

/** Conversa com as mensagens em ordem cronologica. Lanca ApiError 404. */
export function buscarConversa(conversaId: number): Promise<Conversa> {
  return requisitar<Conversa>(`/ia/conversas/${conversaId}`, { revalidate: 0 });
}

/**
 * Cria a conversa a partir da primeira pergunta.
 *
 * A pergunta so' vira TITULO aqui — ela ainda nao foi respondida. Quem a envia
 * de fato e' `perguntarNaConversa`, logo depois, com a conversa ja' existindo.
 */
export function criarConversa(primeiraPergunta: string): Promise<Conversa> {
  return requisitar<Conversa>("/ia/conversas", {
    method: "POST",
    body: { primeira_pergunta: primeiraPergunta },
  });
}

/** Apaga a conversa e as mensagens dela. Lanca ApiError 404. */
export function apagarConversa(conversaId: number): Promise<{ apagada: boolean }> {
  return requisitar<{ apagada: boolean }>(`/ia/conversas/${conversaId}`, {
    method: "DELETE",
  });
}

/**
 * Manda a pergunta e devolve a resposta do assistente.
 *
 * Vai como FormData (multipart) porque carrega arquivo anexado. As aulas vao
 * como IDs em `sessao_ids`: o TEXTO da transcricao e' lido no servidor do
 * CUPCAM e nunca trafega pelo navegador — regra de privacidade, nao detalhe
 * de implementacao.
 *
 * Lanca ApiError 404 (conversa nao existe), 400 (aula sem transcricao),
 * 413 (anexo grande demais), 502 (o modelo falhou) ou 503 (sem chave no
 * servidor). O 503 e' capacidade nao configurada, nao bug.
 */
export function perguntarNaConversa(
  conversaId: number,
  corpo: FormData,
): Promise<RespostaDoAssistente> {
  return requisitar<RespostaDoAssistente>(`/ia/conversas/${conversaId}/perguntar`, {
    method: "POST",
    body: corpo,
  });
}

/** Modelo ativo, lista curada e se ha chave de API no servidor. */
export function lerConfiguracaoIA(): Promise<ConfiguracaoIA> {
  return requisitar<ConfiguracaoIA>("/ia/config", { revalidate: 0 });
}

/** Troca o modelo do assistente. Vale ja' na proxima pergunta. */
export function trocarModeloIA(modelo: string): Promise<{ modelo: string }> {
  return requisitar<{ modelo: string }>("/ia/config", {
    method: "PUT",
    body: { modelo },
  });
}

/**
 * O que foi ensinado na aula: topicos, resumo e ate onde a aula foi.
 *
 * Substituiu o resumo sob demanda que existia aqui ate' 05/08/2026. A diferenca
 * que importa: aquele gerava na hora e jogava fora, cobrando uma chamada ao
 * modelo a cada abertura da tela; este LE um registro ja gravado no fim da aula.
 *
 * GET e cache curto justamente por isso — ler o banco nao custa chamada de IA.
 *
 * Lanca ApiError 404 quando a aula ainda nao tem registro (o pos-sessao nao
 * rodou, ou a sessao nao existe — a tela trata os dois igual).
 */
export function buscarConteudoDaAula(sessaoId: number): Promise<ConteudoDaAula> {
  return requisitar<ConteudoDaAula>(`/sessoes/${sessaoId}/conteudo`, {
    revalidate: 0,
  });
}

/**
 * Onde a turma parou: historico do conteudo dado + um paragrafo da IA.
 *
 * Esta chamada CUSTA uma requisicao ao modelo no backend, ao contrario de
 * buscarConteudoDaAula — por isso `revalidate: 0` aqui nao e' "de graca" como
 * la'. Chamar so' quando a tela da turma abre, nunca em polling.
 *
 * Nao lanca por falha de IA: o backend devolve 200 com `paragrafo: null` e
 * `erro_ia` preenchido, porque o historico e' o dado que o professor foi ver.
 * ApiError 404 significa turma inexistente, que e' outra coisa.
 */
export function buscarContinuidadeDaTurma(
  turmaId: number,
): Promise<ContinuidadeDaTurma> {
  return requisitar<ContinuidadeDaTurma>(`/turmas/${turmaId}/continuidade`, {
    revalidate: 0,
  });
}

/**
 * Diario de classe da aula: conteudo + presenca, com o texto pronto pra copiar.
 *
 * Nao custa chamada de IA — o backend so' formata o que ja esta no banco.
 *
 * Lanca ApiError 404 apenas quando a sessao nao existe. Aula SEM conteudo
 * registrado responde normalmente: a presenca sozinha ja vale o diario.
 */
export function buscarDiarioDaAula(sessaoId: number): Promise<DiarioDaAula> {
  return requisitar<DiarioDaAula>(`/sessoes/${sessaoId}/diario`, {
    revalidate: 0,
  });
}

/**
 * Grava a correcao do professor no registro da aula.
 *
 * Carimba `editado_em` no backend, o que blinda esta versao contra uma geracao
 * automatica posterior sobrescrever o trabalho manual dele.
 *
 * Lanca ApiError 404 (aula sem registro) ou 422 (campo acima do limite).
 */
export function editarConteudoDaAula(
  sessaoId: number,
  conteudo: { topicos: string[]; resumo: string; ate_onde: string },
): Promise<ConteudoDaAula> {
  return requisitar<ConteudoDaAula>(`/sessoes/${sessaoId}/conteudo`, {
    method: "PUT",
    body: conteudo,
  });
}

/** Arquivo exportado: os bytes e os dois headers que o navegador precisa pra baixar. */
export type MaterialExportado = {
  bytes: Blob;
  /** Ex.: "application/pdf". Vem da API — esta funcao nunca decide o tipo. */
  contentType: string;
  /** Ex.: 'attachment; filename="material-2026-08-08.pdf"'. Nome ja sanitizado pela API. */
  contentDisposition: string;
};

/**
 * Exporta o material do chat em .pptx, PDF ou slides em PDF.
 *
 * Nao usa `requisitar<T>`: aquele helper sempre faz `resposta.json()`, e aqui
 * a resposta e' o ARQUIVO em bytes (a rota devolve `Response` binaria, nao
 * JSON). Por isso este fetch e' proprio, mas mantem o mesmo padrao das outras
 * funcoes — mesma base URL, mesmo header de chave.
 *
 * Devolve tambem `Content-Type`/`Content-Disposition`: quem chama (a ponte em
 * app/api/ia/exportar) precisa repassar os dois pro navegador saber que tipo
 * de arquivo e' e sugerir o nome certo no download.
 *
 * O 413 vira mensagem propria porque e' o unico caso que o professor pode
 * resolver sozinho (pedir um material menor). Qualquer outra falha vira uma
 * mensagem generica: a tela nao tem como distinguir "IA fora do ar" de "sem
 * fonte no servidor" sem vazar detalhe de infraestrutura.
 */
export async function exportarMaterial(
  texto: string,
  formato: "pdf" | "pdf-slides" | "pptx",
  titulo: string,
): Promise<MaterialExportado> {
  const { baseUrl, apiKey } = lerConfiguracao();

  let resposta: Response;
  try {
    resposta = await fetch(`${baseUrl}/ia/exportar`, {
      method: "POST",
      headers: {
        "X-API-Key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ texto, formato, titulo }),
      cache: "no-store",
    });
  } catch {
    throw new ApiError(
      "Nao foi possivel falar com a API do CUPCAM. O notebook e o tunel estao ligados?",
      0,
      "/ia/exportar",
    );
  }

  if (!resposta.ok) {
    if (resposta.status === 413) {
      throw new ApiError(
        "Este material é grande demais para exportar.",
        413,
        "/ia/exportar",
      );
    }
    throw new ApiError(
      "Não foi possível gerar o arquivo. Tente de novo.",
      resposta.status,
      "/ia/exportar",
    );
  }

  return {
    bytes: await resposta.blob(),
    contentType: resposta.headers.get("content-type") ?? "application/octet-stream",
    contentDisposition: resposta.headers.get("content-disposition") ?? "attachment",
  };
}
