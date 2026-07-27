/**
 * Turnos da escola — horario de referencia mostrado na grade da turma.
 *
 * Isto e' RECOMENDACAO VISUAL, nunca regra de negocio: serve pra dizer ao
 * coordenador em que faixa as aulas costumam cair e pra alimentar o exemplo
 * que a tecla Tab preenche nos campos de horario. Nada aqui valida, limita ou
 * bloqueia horario nenhum — quem valida horario e' o backend, em
 * `cupcam/gestao/aulas.py`, que continua sendo a fonte unica da verdade.
 *
 * Por que nao vive no banco: guardar a faixa numa coluna de `turmas` criaria
 * um segundo caminho de escrita de horario que NAO passa por `_validar_hora`,
 * exatamente o desvio que ja produziu um bug silencioso neste projeto (um
 * '9:00' nao normalizado fica invisivel pra `buscar_aula_atual`, que compara
 * horario como string). Como o dado e' so' sugestao, derivar em vez de
 * persistir evita a segunda fonte da verdade e a segunda migracao.
 */

export type Turno = {
  id: "manha" | "tarde";
  nome: string;
  /** "HH:MM" — inicio sugerido do periodo. */
  inicio: string;
  /** "HH:MM" — fim sugerido do periodo. */
  fim: string;
};

export const TURNOS: readonly Turno[] = [
  { id: "manha", nome: "Manhã", inicio: "07:00", fim: "12:30" },
  { id: "tarde", nome: "Tarde", inicio: "12:50", fim: "18:30" },
] as const;

export const TURNO_PADRAO = TURNOS[0];

/** Busca um turno pelo id, caindo no padrao se o id nao existir. */
export function turnoPorId(id: string): Turno {
  return TURNOS.find((turno) => turno.id === id) ?? TURNO_PADRAO;
}

/**
 * Diz se uma aula pertence ao turno, olhando a hora em que ela COMECA.
 *
 * So' o inicio decide: uma aula que comeca 11:40 e termina 13:10 e' aula da
 * manha que passou do horario, nao uma aula da tarde. Classificar pelo fim
 * faria essa aula sumir da grade da manha, que e' onde o coordenador a
 * procura.
 *
 * O limite superior do turno da manha e' o INICIO da tarde (12:50), nao o fim
 * da manha (12:30): sem isso uma aula das 12:40 nao cairia em turno nenhum e
 * ficaria invisivel nas duas visoes. A regra aqui e' de EXIBICAO — ela nunca
 * impede cadastrar aula em horario nenhum.
 */
export function dentroDoTurno(horaInicio: string, turno: Turno): boolean {
  // "HH:MM" tem sempre 5 caracteres com zero a esquerda, entao comparar como
  // string ja ordena por horario.
  if (turno.id === "manha") return horaInicio < TURNOS[1].inicio;
  return horaInicio >= TURNOS[1].inicio;
}

/**
 * Deduz o turno de uma turma a partir das aulas que ela ja tem.
 *
 * A aula que comeca mais cedo decide, usando o MESMO corte de
 * `dentroDoTurno`. Ter dois limiares diferentes pra mesma pergunta abriria um
 * caso absurdo: a tela deduziria "manha" e em seguida esconderia, por estar
 * "fora da manha", justamente a aula que motivou a deducao.
 *
 * Turma sem aula nenhuma devolve `null`: nao ha o que deduzir, e a tela
 * precisa saber a diferenca entre "deduzi manha" e "nao sei" pra deixar o
 * coordenador escolher em vez de assumir por ele.
 */
export function deduzirTurno(horasDeInicio: readonly string[]): Turno | null {
  if (horasDeInicio.length === 0) return null;

  // "HH:MM" tem sempre 5 caracteres com zero a esquerda (o backend normaliza),
  // entao a comparacao lexicografica de string ja ordena por horario.
  const maisCedo = horasDeInicio.reduce((menor, hora) => (hora < menor ? hora : menor));

  return dentroDoTurno(maisCedo, TURNOS[0]) ? TURNOS[0] : TURNOS[1];
}
