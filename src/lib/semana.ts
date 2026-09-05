/**
 * O periodo de uma semana, pra buscar os eventos da agenda.
 *
 * Fica separado das paginas porque as DUAS telas de agenda (a de todas as
 * turmas e a de uma turma) precisam do mesmo calculo — e um recorte diferente
 * em cada uma faria a mesma semana trazer eventos diferentes conforme o
 * caminho pelo qual o professor chegou nela.
 */

/** "AAAA-MM-DD" no fuso LOCAL. */
function comoISO(data: Date) {
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${data.getFullYear()}-${mes}-${dia}`;
}

/**
 * O fuso em que "hoje" e' decidido, cravado de proposito.
 *
 * POR QUE EXISTE (04/09/2026): `new Date()` le o relogio de QUEM ESTA
 * CALCULANDO, e servidor e navegador nao sao a mesma maquina. A Vercel roda em
 * **UTC**; o professor esta em **UTC-3**. Entre 21h e meia-noite no horario
 * dele ja' e' o dia seguinte em UTC — o servidor montava a semana de um dia, o
 * navegador re-hidratava com a de outro, o HTML nao batia e o React abortava a
 * hidratacao (erro #441). Na tela isso aparecia como "Algo deu errado ...
 * verifique se a API do CUPCAM esta respondendo", culpando a API — que tinha
 * respondido 200 nas duas requisicoes.
 *
 * `Intl` com `timeZone` fixo devolve a MESMA data em qualquer fuso do processo
 * (conferido em UTC, America/Sao_Paulo e Asia/Tokyo: os tres deram 2026-09-04),
 * e funciona igual no servidor e no navegador — diferente de `process.env.TZ`,
 * que nao existe no cliente.
 *
 * Quando o CUPCAM atender escola fora deste fuso, a correcao certa deixa de ser
 * uma constante: o servidor decide a semana uma vez e manda pronta, e o cliente
 * nunca recalcula.
 */
const FUSO_DA_ESCOLA = "America/Sao_Paulo";

/** "AAAA-MM-DD" de hoje no fuso da escola, independente de onde o codigo roda. */
function hojeNoFusoDaEscola(): string {
  // "en-CA" formata como AAAA-MM-DD, que e' o mesmo ISO que o resto do app usa.
  return new Intl.DateTimeFormat("en-CA", { timeZone: FUSO_DA_ESCOLA }).format(
    new Date(),
  );
}

/**
 * Domingo e sabado da semana em que `data` cai.
 *
 * Comeca no DOMINGO, e nao na segunda, porque a grade da agenda e' indexada
 * por `dia_semana` com 0 = domingo (a convencao do banco). O recorte que
 * alimenta as colunas precisa bater com o que elas desenham.
 *
 * `data` ausente (ou fora do formato) cai na semana de HOJE: um endereco
 * digitado errado mostra a semana corrente, nunca uma tela vazia.
 *
 * A leitura e' feita com `new Date(ano, mes, dia)`, nunca `new Date(texto)`:
 * a segunda forma interpreta "AAAA-MM-DD" como UTC e, no Brasil (UTC-3),
 * devolveria o dia anterior — a semana inteira deslizaria.
 *
 * O intervalo pega os 7 dias inteiros mesmo quando a tela esconde o fim de
 * semana: um evento marcado no sabado precisa ser encontrado pra que a coluna
 * do sabado apareca.
 */
export function periodoDaSemana(data?: string): {
  inicio: string;
  fim: string;
} {
  // Hoje SEMPRE vem do fuso da escola, nunca do relogio da maquina: e' o que
  // faz servidor e navegador chegarem na mesma semana (ver FUSO_DA_ESCOLA).
  const [anoHoje, mesHoje, diaHoje] = hojeNoFusoDaEscola().split("-").map(Number);
  let referencia = new Date(anoHoje, mesHoje - 1, diaHoje);

  if (data) {
    const [ano, mes, dia] = data.split("-").map(Number);
    if (ano && mes && dia) {
      referencia = new Date(ano, mes - 1, dia);
    }
  }

  const domingo = new Date(referencia);
  domingo.setDate(referencia.getDate() - referencia.getDay());

  const sabado = new Date(domingo);
  sabado.setDate(domingo.getDate() + 6);

  return { inicio: comoISO(domingo), fim: comoISO(sabado) };
}

/**
 * O periodo que a AGENDA precisa buscar: a semana exibida MAIS o mes inteiro
 * que a contem.
 *
 * POR QUE MAIS QUE A SEMANA: o botao "Semana / Mes" e' estado do cliente — ele
 * troca a visao sem nova requisicao ao servidor. Buscando so' os 7 dias, o modo
 * mes abriria com os outros dias VAZIOS de evento, e o professor concluiria que
 * nao marcou nada neles.
 *
 * O custo de ampliar e' baixo: continua UMA consulta, e o indice de data cobre
 * o intervalo maior sem varredura (medido: o mes inteiro nao custou mais que a
 * semana).
 *
 * As bordas do mes entram inteiras porque a grade do mes desenha os dias que
 * sobram da primeira e da ultima semana.
 */
export function periodoDaAgenda(data?: string): {
  inicio: string;
  fim: string;
} {
  const semana = periodoDaSemana(data);

  // O mes da semana exibida, pelo DOMINGO dela: uma semana que atravessa a
  // virada do mes pertence, pra este calculo, ao mes em que ela comeca.
  const [ano, mes, dia] = semana.inicio.split("-").map(Number);
  const domingo = new Date(ano, mes - 1, dia);

  const primeiroDoMes = new Date(domingo.getFullYear(), domingo.getMonth(), 1);
  const ultimoDoMes = new Date(domingo.getFullYear(), domingo.getMonth() + 1, 0);

  // O domingo da primeira semana do mes e o sabado da ultima: e' o que a grade
  // do mes desenha, incluindo os dias de fora que fecham as linhas.
  const inicio = new Date(primeiroDoMes);
  inicio.setDate(primeiroDoMes.getDate() - primeiroDoMes.getDay());
  const fim = new Date(ultimoDoMes);
  fim.setDate(ultimoDoMes.getDate() + (6 - ultimoDoMes.getDay()));

  // A semana exibida pode cair fora do mes calculado (ela atravessa a virada).
  // Pegar o menor inicio e o maior fim garante que ela SEMPRE esteja dentro.
  return {
    inicio: semana.inicio < comoISO(inicio) ? semana.inicio : comoISO(inicio),
    fim: semana.fim > comoISO(fim) ? semana.fim : comoISO(fim),
  };
}
