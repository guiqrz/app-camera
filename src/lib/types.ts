/**
 * Tipos das respostas da API do CUPCAM.
 *
 * Escritos a partir do JSON REAL capturado das rotas em 21/07/2026, nao de
 * suposicao. Fonte da verdade: cupcam/persistencia/consultas.py (os montadores
 * montar_*) e cupcam/web/api.py (as rotas) no repositorio do backend.
 *
 * Sobre `null`: varios campos vem nulos de proposito quando ainda nao ha dado
 * (aula em curso, sessao sem leitura de engajamento). Nulo significa "sem
 * dado" e a interface deve dizer isso — NUNCA mostrar 0 no lugar, porque zero
 * ali significaria "turma 100% desatenta", que e' uma afirmacao diferente.
 */

/** Faixa de cor do card de aula, decidida pelo backend (nunca recalcular aqui). */
export type StatusEngajamento = "alto" | "moderado" | "atencao";

/** GET /turmas */
export type Turma = {
  id: number;
  nome: string;
  sala_id: string;
  /** 0 = domingo ... 6 = sabado (convencao do strftime %w usada no backend). */
  dia_semana: number;
  /** "HH:MM", sempre com zero a esquerda. */
  hora_inicio: string;
  hora_fim: string;
};

/** Identificacao curta de turma, embutida em varias respostas. */
export type TurmaResumo = {
  id: number;
  nome: string;
};

/** Um card da tela "Minhas Aulas". */
export type AulaCard = {
  sessao_id: number;
  /** "AAAA-MM-DD". */
  data: string;
  /** Nome do dia em portugues, ja pronto ("sexta"). */
  dia_semana: string;
  hora_inicio: string;
  hora_fim: string;
  /** 0-100. Nulo enquanto a aula nao tem leitura de engajamento. */
  engajamento_pct: number | null;
  /** Nulo pelo mesmo motivo de engajamento_pct. */
  status: StatusEngajamento | null;
  /** Primeira recomendacao gravada para a sessao. Nulo se nao houver. */
  resumo: string | null;
  em_andamento: boolean;
};

/** GET /turmas/{turma_id}/aulas */
export type AulasDaTurma = {
  turma: TurmaResumo;
  aulas: AulaCard[];
};

/**
 * Uma linha da chamada.
 *
 * `presente`, `detectado_automaticamente` e `confirmado_professor` vem do
 * SQLite como 0 ou 1, nao como booleano.
 *
 * IMPORTANTE: `frequencia_pct` e' PRESENCA historica do aluno, nunca
 * engajamento. O projeto proibe vincular medida de atencao a uma pessoa; os
 * desenhos das telas que falam em "engajamento por aluno" usaram o nome
 * errado e devem exibir este campo.
 */
export type AlunoChamada = {
  ra: string;
  nome: string;
  presente: 0 | 1;
  detectado_automaticamente: 0 | 1;
  confirmado_professor: 0 | 1;
  /** 0-100, com uma casa decimal. Nulo se o aluno nao tem historico. */
  frequencia_pct: number | null;
};

export type SessaoResumo = {
  id: number;
  /** Nome da turma, ja resolvido pelo backend. */
  turma: string;
  /** "AAAA-MM-DD HH:MM:SS" no fuso local. */
  iniciada_em: string;
  /** Nulo enquanto a aula esta em curso. */
  encerrada_em: string | null;
};

/** GET /sessoes/{sessao_id}/chamada */
export type ChamadaDaSessao = {
  sessao: SessaoResumo;
  resumo: {
    total: number;
    presentes: number;
    ausentes: number;
    detectados_automaticamente: number;
    /** Nulo quando a turma nao tem nenhum aluno matriculado. */
    presenca_pct: number | null;
  };
  comparativo: {
    hoje_pct: number | null;
    /** Media das outras sessoes da turma. Nulo se esta e' a primeira. */
    media_historica_pct: number | null;
  };
  alunos: AlunoChamada[];
};

/** Um ponto da linha do tempo de engajamento (um por minuto de aula). */
export type PontoLinhaDoTempo = {
  /** Minutos desde o inicio da aula (0 = primeiro minuto). */
  minuto: number;
  /** "HH:MM" no relogio. */
  horario: string;
  /** 0-100. Aqui zero e' medicao real: "ninguem atento neste minuto". */
  atencao_pct: number;
};

/** Um item do feed de insights gerado pelo sistema ao encerrar a aula. */
export type ItemFeedInsight = {
  titulo: string;
  descricao: string;
  /** Presente em parte dos insights; usado para escolher o icone. */
  tipo?: string;
};

/** GET /sessoes/{sessao_id}/relatorio — a rota mais completa. */
export type RelatorioDaSessao = {
  sessao: SessaoResumo & { em_andamento: boolean };
  /** Media de "atento" na aula, 0-100. Nulo sem leitura. */
  engajamento_medio_pct: number | null;
  /** Diferenca em pontos percentuais contra a media das aulas anteriores.
      Positivo = melhor que o historico. Nulo se nao ha com o que comparar.
      Atencao: e' "vs media historica", NAO "vs ontem". */
  variacao_vs_historico_pct: number | null;
  /** Melhor e pior minuto da aula. Nulos quando nao ha linha do tempo. */
  pico_atencao: PontoLinhaDoTempo | null;
  queda_atencao: PontoLinhaDoTempo | null;
  /** Minutos em que a atencao ficou acima do limiar de foco. */
  tempo_foco_minutos: number | null;
  presenca: {
    detectados: number;
    presentes: number;
    total: number;
    pct: number | null;
    ausentes: number;
  };
  linha_do_tempo: PontoLinhaDoTempo[];
  recomendacoes: string[];
  /** Costuma vir vazio; a tela precisa de um estado "sem insights". */
  feed_insights: ItemFeedInsight[];
  chamada: AlunoChamada[];
};

/** GET /turmas/{turma_id}/estatisticas */
export type EstatisticasDaTurma = {
  turma: TurmaResumo;
  aulas_monitoradas: number;
  alunos_analisados: number;
  /** "AAAA-MM-DD HH:MM:SS". Nulos se a turma nunca teve sessao. */
  primeira_sessao: string | null;
  ultima_sessao: string | null;
};

/** Resposta de POST /sessoes/{id}/chamada/{ra}/confirmar */
export type ConfirmacaoPresencaResposta = {
  sessao_id: number;
  ra: string;
  presente: boolean;
  confirmado: boolean;
};

/* ------------------------------------------------------------------ */
/* Administracao                                                      */
/* ------------------------------------------------------------------ */

/** Uma turma na tela de Administracao (GET /admin/visao). */
export type TurmaAdmin = {
  id: number;
  nome: string;
  sala_id: string;
  /** 0 = domingo ... 6 = sabado (convencao do strftime %w usada no backend). */
  dia_semana: number;
  /** Nome do dia em portugues, ja pronto pelo backend. */
  dia_semana_nome: string;
  hora_inicio: string;
  hora_fim: string;
  total_alunos: number;
};

/** Um aluno na tela de Administracao (GET /admin/visao). */
export type AlunoAdmin = {
  ra: string;
  nome: string;
  turma_id: number;
  /** true se o aluno tem foto/embedding cadastrado (a camera consegue reconhece-lo). */
  tem_reconhecimento: boolean;
};

/** GET /admin/visao — visao completa que alimenta a tela de Administracao. */
export type VisaoAdmin = {
  turmas: TurmaAdmin[];
  alunos: AlunoAdmin[];
  totais: {
    turmas: number;
    alunos: number;
  };
};

/** Corpo de POST /admin/turmas. */
export type NovaTurma = {
  nome: string;
  sala_id: string;
  dia_semana: number;
  hora_inicio: string;
  hora_fim: string;
};
