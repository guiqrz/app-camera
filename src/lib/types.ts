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
  /** Nome do dia em portugues, ja pronto ("sexta"). Derivado do timestamp da sessao, nunca nulo. */
  dia_semana: string;
  /**
   * Horario AGENDADO, da aula da grade. "HH:MM".
   *
   * Nulo quando a sessao nao tem aula associada (camera ligada na mao, ou aula
   * excluida depois) — nesse caso so' existe o horario real abaixo.
   */
  hora_inicio: string | null;
  hora_fim: string | null;
  /**
   * Horario REAL da captura, de sessoes.iniciada_em/encerrada_em. "HH:MM".
   *
   * O inicio sempre existe: a sessao so' entra no banco quando a captura comeca.
   * O fim e' nulo enquanto a aula esta em andamento — nunca "agora", porque isso
   * faria o card afirmar que ela ja acabou.
   */
  hora_real_inicio: string;
  hora_real_fim: string | null;
  /** Nulo pelo mesmo motivo de hora_inicio/hora_fim. */
  materia: string | null;
  /** 0-100. Nulo enquanto a aula nao tem leitura de engajamento. */
  engajamento_pct: number | null;
  /** Nulo pelo mesmo motivo de engajamento_pct. */
  status: StatusEngajamento | null;
  /** Primeira recomendacao gravada para a sessao. Nulo se nao houver. */
  resumo: string | null;
  /**
   * TITULO da aula — o 1o topico registrado em `conteudos_aula`.
   *
   * Nulo quando a aula nao tem conteudo registrado, que e' o caso dominante no
   * banco real. Nesse caso a tela escreve "Aula sem registro": derivar um
   * titulo da data faria toda aula sem conteudo parecer registrada.
   */
  titulo: string | null;
  /**
   * Resumo do CONTEUDO (o que foi ensinado), diferente de `resumo`, que e' a
   * primeira recomendacao da IA.
   */
  conteudo_resumo: string | null;
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
  /** Nulo quando a sessao nao tem aula associada (camera ligada na mao, ou aula excluida depois). */
  hora_inicio: string | null;
  hora_fim: string | null;
  /** Nulo pelo mesmo motivo de hora_inicio/hora_fim. */
  materia: string | null;
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

/**
 * Trecho da aula em que a atencao NAO foi medida (modo Descanso ou Prova).
 *
 * Os minutos sao contados do inicio da aula, na mesma escala de
 * `PontoLinhaDoTempo.minuto` — e' o que permite desenhar a faixa alinhada com a
 * curva. `cor` e' um id de paleta ("ambar", "azul"), nunca um valor CSS: quem
 * resolve o tom em cada tema e' o app.
 */
export type PeriodoSemMedicao = {
  modo: string;
  rotulo: string;
  cor: string;
  minuto_inicio: number;
  minuto_fim: number;
  horario_inicio: string;
  horario_fim: string;
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
  /** Vaos da linha do tempo (Descanso/Prova). Vazio numa aula normal. */
  periodos_sem_medicao: PeriodoSemMedicao[];
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
  /**
   * Presenca COLETIVA da turma (0-100): presencas sobre registros de chamada.
   *
   * E' frequencia, nunca engajamento — o projeto proibe medida de atencao por
   * pessoa, e este numero e' agregado, sem RA. `null` quando a turma nunca teve
   * chamada: 0 diria "todo mundo faltou".
   */
  frequencia_media_pct: number | null;
  /** As contagens cruas, pra escrever "25 presencas em 58". */
  presencas_registradas: number;
  chamadas_registradas: number;
  /**
   * A mesma frequencia por sessao, em ordem cronologica — as barrinhas do
   * card. Sessao sem chamada nao entra: barra a zero leria como "ninguem veio"
   * onde nada foi medido.
   */
  frequencia_por_aula: {
    sessao_id: number;
    data: string;
    frequencia_pct: number;
  }[];
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
};

/**
 * Id de cor da materia. Espelha CORES_MATERIA em cupcam/gestao/materias.py —
 * o backend responde 422 pra qualquer valor fora desta lista. O banco guarda
 * o id ("azul"), nunca um valor CSS: o tom exato de cada cor no tema claro e
 * no escuro e' decisao do site (ver APARENCIA_COR_MATERIA em lib/format.ts).
 */
export type CorMateria =
  | "azul"
  | "verde"
  | "ambar"
  | "vermelho"
  | "roxo"
  | "rosa"
  | "ciano"
  | "cinza";

/** GET /admin/materias */
export type Materia = {
  id: number;
  nome: string;
  /** Nula quando a materia nao tem cor — a tela a mostra sem grifo. */
  cor: CorMateria | null;
};

/**
 * Corpo de POST/PUT /admin/materias.
 *
 * ATENCAO no PUT: e' substituicao TOTAL, igual ao de aula — `cor: null` LIMPA
 * a cor da materia. Quem edita reenvia sempre a cor atual pra nao apaga-la
 * sem querer.
 */
export type NovaMateria = { nome: string; cor: CorMateria | null };

/** Uma aula da grade de uma turma (GET /admin/turmas/{id}/aulas). */
export type Aula = {
  id: number;
  turma_id: number;
  /** Nome da turma. Necessario na agenda de TODAS as turmas, onde cada bloco
   *  precisa dizer de quem ele e'. */
  turma_nome: string;
  /** 0 = domingo ... 6 = sabado. */
  dia_semana: number;
  dia_semana_nome: string;
  hora_inicio: string;
  hora_fim: string;
  materia_id: number | null;
  materia_nome: string | null;
  /** Cor da materia da aula. Nula sem materia, ou com materia sem cor. */
  materia_cor: CorMateria | null;
  /**
   * Texto livre que o professor escreve pra si mesmo ("comecar pelo
   * experimento"). String VAZIA quando nao ha plano, nunca nula — o backend
   * grava "" por padrao, e quem le nunca precisa distinguir os dois casos.
   */
  plano: string;
  /** Nome do arquivo anexado. Nulo quando a aula nao tem anexo. */
  anexo_nome: string | null;
  anexo_tipo: string | null;
  anexo_tamanho: number | null;
  /** Atalho para `anexo_nome !== null`, ja pronto pela API. */
  tem_anexo: boolean;
};

/**
 * Um dia da grade semanal (GET /visao-geral e /turmas/{id}/semana).
 *
 * A API devolve SEMPRE os 7 dias, domingo a sabado, mesmo os vazios: dia que
 * some faria a grade encolher e as colunas desalinharem entre semanas.
 *
 * Nao ha data de calendario aqui — a tabela `aulas` e' uma GRADE que se repete
 * toda semana, entao ela guarda o dia (0-6), nao a data. Mapear dia -> "Seg 10"
 * e' decisao de apresentacao, e quem sabe qual semana esta na tela e' a tela.
 */
export type DiaDaSemana = {
  /** 0 = domingo ... 6 = sabado. */
  dia_semana: number;
  dia_semana_nome: string;
  aulas: Aula[];
};

/** Quantas aulas cada materia teve (as fatias do donut da visao geral). */
export type AulasPorMateria = {
  /**
   * Nome da materia, ou "sem materia" para as sessoes sem aula da grade
   * vinculada (camera ligada na mao). Elas NAO sao descartadas: no banco real
   * sao a maioria, e omiti-las faria as fatias somarem menos que o total.
   */
  materia: string;
  total: number;
};

/** GET /visao-geral — o estado "Todas as turmas" da tela Minhas Aulas. */
export type VisaoGeral = {
  /** Sessoes que aconteceram, incluindo as que nunca foram encerradas. */
  total_aulas: number;
  total_alunos: number;
  total_turmas: number;
  /** Nao conta a fatia "sem materia" — ela nao e' uma materia. */
  total_materias: number;
  aulas_por_materia: AulasPorMateria[];
  /**
   * Soma das sessoes ENCERRADAS, em horas com 1 decimal.
   *
   * Sessao orfa (que nunca fechou) fica de FORA: conta-la "ate agora" faria uma
   * sessao esquecida de tres dias atras somar 72 horas.
   */
  horas_em_sala: number;
  /** Quantas sessoes ficaram sem encerrar — a tela usa isto pra dizer que o
   *  numero acima exclui algo, em vez de mentir por omissao. */
  sessoes_em_aberto: number;
  semana: DiaDaSemana[];
  lembretes: Lembrete[];
};

/**
 * Recado do professor pra si mesmo na tela Minhas Aulas.
 *
 * Sem turma, sem prioridade e sem categoria DE PROPOSITO (ver o comentario da
 * tabela em banco.py) — a ausencia e' o desenho, nao falta de implementacao.
 */
export type Lembrete = {
  id: number;
  texto: string;
  /** "AAAA-MM-DD". Nula quando o lembrete nao tem prazo — o caso comum. */
  data: string | null;
  feito: boolean;
  /** ISO com segundos, do backend. */
  criado_em: string;
};

/**
 * Corpo do PATCH de lembrete — altera SO' os campos enviados.
 *
 * ATENCAO: `data` distingue tres coisas. Campo AUSENTE mantem a data atual;
 * `data: null` APAGA o prazo; uma string troca. Por isso os campos sao
 * opcionais em vez de anulaveis com valor padrao — marcar como feito manda
 * so' `{feito: true}` e nao pode limpar o prazo por acidente.
 */
export type LembreteEditado = {
  texto?: string;
  data?: string | null;
  feito?: boolean;
};

/** Corpo de POST/PUT de aula. */
export type NovaAula = {
  dia_semana: number;
  hora_inicio: string;
  hora_fim: string;
  materia_id: number | null;
};

/* ------------------------------------------------------------------ */
/* Camera                                                              */
/* ------------------------------------------------------------------ */

/**
 * Modo de operacao da camera (espelha cupcam/modos.py).
 *
 * Nao e' rotulo visual: fora de "aula" o backend nao classifica pose nem grava
 * engajamento. Ver `mede_atencao` no EstadoCamera.
 *
 * "lousa" e' de outra natureza que os tres primeiros: eles decidem o que medir
 * NA TURMA, e ele vira a camera pro QUADRO. E' o unico em que o professor
 * captura uma imagem, e ela fica guardada na aula.
 */
export type ModoCamera = "aula" | "descanso" | "prova" | "lousa";

/**
 * Um modo com os textos que o backend manda (GET /camera/modos).
 *
 * Sao dois niveis de texto de proposito (ver DESCRICOES em cupcam/modos.py):
 * `resumo` e' lido de relance no cartao, `detalhe` so' aparece a quem abre o
 * "?" — e' onde cabe explicar o que DEIXA de ser gravado, informacao que o
 * professor precisa uma vez e nao toda aula.
 */
export type ModoCameraInfo = {
  id: ModoCamera;
  rotulo: string;
  /** Uma linha curta, sempre visivel abaixo do nome. */
  resumo: string;
  /** Texto do balao de ajuda. Explica o que muda de fato na captura. */
  detalhe: string;
  /**
   * Cor que identifica o modo, como id de paleta — nunca valor CSS. Reusa o
   * vocabulario de CorMateria de proposito: o projeto tem uma paleta so', e o
   * tom exato em cada tema fica em aparenciaDaCorMateria (lib/format.ts).
   */
  cor: CorMateria;
  /** false = neste modo a atencao da turma nao esta sendo medida. */
  mede_atencao: boolean;
};

/** Estado ao vivo da captura, espelha o estado_camera.json do backend. */
export type EstadoCamera =
  // Parada, ou iniciando: `iniciando` = o processo subiu mas o boot dos modelos
  // ainda nao escreveu o primeiro estado (dura alguns segundos). Em ambos os
  // casos rodando=false — a UI so' mostra os numeros no ramo rodando:true.
  | { rodando: false; iniciando?: boolean }
  | {
      rodando: true;
      atualizado_em: string;
      turma: { id: number; nome: string } | null;
      sessao_id: number | null;
      chamada: { presentes: number; total: number };
      pct_desatento: number;
      media_pessoas: number;
      fps: number | null;
      mqtt: boolean;
      alerta_atencao: boolean;
      /**
       * Modo em vigor NA CAMERA, nao o ultimo clicado: a troca so' vale no
       * proximo ciclo do backend, entao e' este campo que confirma que ela
       * aconteceu de verdade.
       *
       * Opcional porque um estado escrito por um backend anterior a esta
       * versao nao traz o campo.
       */
      modo?: ModoCamera;
      /**
       * false = a atencao NAO esta sendo medida neste modo. Existe pra tela
       * nao mostrar "0% disperso" como se fosse um bom resultado quando na
       * verdade nao ha medicao nenhuma acontecendo.
       */
      mede_atencao?: boolean;
      /**
       * true = a camera esta GRAVANDO audio da aula neste instante.
       *
       * Vem da captura, nao do comando: e' a confirmacao de que a gravacao
       * comecou de fato, e nao apenas que alguem clicou no botao. E' o que
       * autoriza a tela a mostrar a faixa "Gravando audio" — sem aviso visivel
       * seria gravacao silenciosa de uma sala com menores.
       *
       * Opcional porque um estado escrito por um backend anterior a esta versao
       * nao traz o campo; ausente e' tratado como false (nao gravando).
       */
      audio_ativo?: boolean;
    };

/* ------------------------------------------------------------------ */
/* Transcricao                                                         */
/* ------------------------------------------------------------------ */

/**
 * Em que pe esta a transcricao de uma aula.
 *
 * A distincao existe porque "sem transcricao" escondia tres casos diferentes:
 * a aula nao gravou audio, esta transcrevendo agora, ou falhou. O professor
 * precisa saber qual — so' o terceiro pede acao dele.
 */
export type EstadoTranscricao = "transcrevendo" | "pronta" | "falhou";

export type TrechoTranscricao = {
  segundo_inicio: number;
  segundo_fim: number;
  texto: string;
};

export type Transcricao = {
  sessao_id: number;
  turma: string;
  /** null quando a sessao nao tem aula agendada vinculada. */
  materia: string | null;
  data: string;
  texto: string;
  modelo: string;
  duracao_seg: number | null;
  gerada_em: string;
  /** Quando a transcricao sera apagada. Visivel na tela de proposito: e' o
   *  contrato de privacidade dos 60 dias, nao um detalhe interno. */
  expira_em: string;
  estado: EstadoTranscricao;
  /** Motivo da falha, ou null. */
  erro: string | null;
  trechos: TrechoTranscricao[];
};

/* ------------------------------------------------------------------ */
/* Lousa (modo Lousa)                                                  */
/* ------------------------------------------------------------------ */

/**
 * Em que pe esta a leitura do quadro.
 *
 * Mesma logica de EstadoTranscricao, e pelo mesmo motivo: sem o estado, um
 * texto vazio esconderia dois casos que pedem coisas diferentes do professor —
 * "o Gemini ainda esta lendo" e "o quadro estava em branco".
 */
export type EstadoLousa = "lendo" | "pronta" | "falhou";

/**
 * Um quadro capturado, com o texto lido dele.
 *
 * Sem a imagem: cada JPEG vem pela rota propria
 * (/api/sessoes/[id]/lousas/[lousaId]/imagem), porque uma aula com varias
 * capturas devolveria megabytes de base64 num JSON que a tela nem usaria assim.
 */
export type Lousa = {
  id: number;
  sessao_id: number;
  /** null enquanto a leitura nao terminou. */
  texto: string | null;
  /** null ate' o modelo responder. */
  modelo: string | null;
  estado: EstadoLousa;
  /** Motivo da falha, ou null. */
  erro: string | null;
  capturada_em: string;
  /** Quando a imagem sera apagada. Visivel na tela pelo mesmo motivo da
   *  transcricao: os 60 dias sao contrato de privacidade, nao detalhe. */
  expira_em: string;
};

/* ------------------------------------------------------------------ */
/* Cup AI                                                              */
/* ------------------------------------------------------------------ */

/** Quem escreveu a mensagem. O backend so' aceita estes dois valores. */
export type PapelMensagem = "professor" | "assistente";

export type MensagemConversa = {
  id: number;
  papel: PapelMensagem;
  texto: string;
  criada_em: string;
  /**
   * Rotulos do que foi anexado ("prova.pdf", "Aula 31/07 · Biologia").
   *
   * So' o rotulo — o arquivo em si nunca e' guardado. Serve pro professor
   * lembrar o que mandou ao reabrir a conversa. Vazio nas mensagens sem anexo,
   * nas do assistente e nas gravadas antes desta coluna existir.
   */
  anexos?: string[];
};

export type Conversa = {
  id: number;
  titulo: string;
  atualizada_em: string;
  /** So' na busca por id; a listagem traz apenas o cabecalho. */
  criada_em?: string;
  /** So' vem na busca por id; a listagem traz apenas o cabecalho. */
  mensagens?: MensagemConversa[];
};

/** Modelo da lista curada do backend (cupcam/ia/modelos.py). */
export type ModeloIA = {
  id: string;
  rotulo: string;
  descricao: string;
};

export type ConfiguracaoIA = {
  modelo: string;
  modelos: ModeloIA[];
  /** Sem chave no servidor o assistente responde 503 — a tela avisa em vez de
   *  deixar o professor perguntar no vazio. */
  chave_configurada: boolean;
};

/** Resposta de uma pergunta: o texto do assistente e o modelo que respondeu. */
export type RespostaDoAssistente = {
  resposta: string;
  modelo: string;
};

/**
 * Algo anexado a' pergunta.
 *
 * Aula vai como ID, nunca como texto: o conteudo da transcricao e' lido no
 * servidor do CUPCAM e nunca trafega pelo navegador. Regra de privacidade da
 * transcricao, nao detalhe de implementacao.
 */
export type Anexo =
  | { tipo: "aula"; sessaoId: number; rotulo: string }
  | { tipo: "arquivo"; arquivo: File };

/**
 * O que foi ensinado numa aula. Gerado pela IA no fim da aula e editavel pelo
 * professor — `editado_em` preenchido significa que ele corrigiu, e a geracao
 * automatica nao sobrescreve mais.
 */
export type ConteudoDaAula = {
  id: number;
  sessao_id: number;
  topicos: string[];
  resumo: string;
  ate_onde: string;
  /** 'transcricao' | 'lousa' | 'transcricao+lousa' | 'nenhuma' */
  fonte: string;
  modelo: string | null;
  gerado_em: string;
  editado_em: string | null;
};

/** Uma aula no historico de "onde parei nesta turma". */
export type AulaNoHistorico = {
  sessao_id: number;
  /** Quando a aula aconteceu ("YYYY-MM-DD HH:MM:SS"). */
  data: string;
  topicos: string[];
  resumo: string;
  ate_onde: string;
  /** 'nenhuma' quando a aula nao teve transcricao nem quadro. */
  fonte: string;
  editado_em: string | null;
};

/**
 * Tela "Onde parei nesta turma?" (feature D).
 *
 * `paragrafo` e' conveniencia; `aulas` e' o dado. Quando a IA falha — ou quando
 * a turma ainda nao tem aula com conteudo registrado, que e' caso ESPERADO e
 * nao erro — o backend devolve 200 com `paragrafo: null` e `erro_ia`
 * preenchido, e a tela mostra o historico assim mesmo.
 */
export type ContinuidadeDaTurma = {
  turma: TurmaResumo;
  /** A mais recente. Vem repetida dentro de `aulas`, pro destaque da tela. */
  ultima_aula: AulaNoHistorico | null;
  aulas: AulaNoHistorico[];
  total: number;
  paragrafo: string | null;
  modelo: string | null;
  erro_ia: string | null;
};

/**
 * Diario de classe de uma aula (feature I): conteudo + presenca.
 *
 * `texto` e' o diario pronto pro professor copiar no sistema da escola — o
 * backend monta a string, sem IA, pra que o mesmo diario saia igual toda vez.
 * Os campos estruturados existem pra tela mostrar a mesma informacao do jeito
 * dela, sem precisar reanalisar o texto.
 *
 * `conteudo` e' null quando a aula nao tem registro; o diario continua valendo
 * pela presenca.
 */
export type DiarioDaAula = {
  sessao: {
    id: number;
    turma: string;
    materia: string | null;
    iniciada_em: string;
    encerrada_em: string | null;
  };
  conteudo: ConteudoDaAula | null;
  chamada: {
    total: number;
    presentes: number;
    ausentes: number;
    /** null quando a turma nao tem aluno — "0%" seria outra afirmacao. */
    presenca_pct: number | null;
    nomes_ausentes: { ra: string; nome: string }[];
  };
  texto: string;
};
