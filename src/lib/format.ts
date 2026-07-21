/**
 * Formatacao de datas, horarios e faixas de engajamento.
 *
 * Centralizado aqui para que toda tela mostre o mesmo dado do mesmo jeito.
 */

import type { StatusEngajamento } from "./types";

/** Aparencia de cada faixa de engajamento. As cores vem dos tokens. */
export const APARENCIA_STATUS: Record<
  StatusEngajamento,
  { rotulo: string; cor: string; fundo: string; texto: string }
> = {
  alto: {
    rotulo: "Alto engajamento",
    cor: "var(--ok)",
    fundo: "var(--ok-bg)",
    texto: "var(--ok-fg)",
  },
  moderado: {
    rotulo: "Engajamento moderado",
    cor: "var(--warn)",
    fundo: "var(--warn-bg)",
    texto: "var(--warn-fg)",
  },
  atencao: {
    rotulo: "Atenção recomendada",
    cor: "var(--danger)",
    fundo: "var(--danger-bg)",
    texto: "var(--danger-fg)",
  },
};

/** Aparencia neutra para aula sem leitura de engajamento. */
export const APARENCIA_SEM_DADOS = {
  rotulo: "Sem dados",
  cor: "var(--text-muted)",
  fundo: "var(--surface-2)",
  texto: "var(--text-muted)",
};

export function aparenciaDoStatus(status: StatusEngajamento | null) {
  return status === null ? APARENCIA_SEM_DADOS : APARENCIA_STATUS[status];
}

/**
 * Converte "AAAA-MM-DD" para "DD/MM".
 *
 * Recorta a string em vez de usar `new Date`: a data vem sem fuso horario, e
 * o construtor de Date a interpretaria como UTC, o que pode exibir o dia
 * anterior dependendo do fuso do navegador.
 */
export function formatarDataCurta(data: string): string {
  const [, mes, dia] = data.split("-");
  if (!mes || !dia) return data;
  return `${dia}/${mes}`;
}

/** Converte "AAAA-MM-DD" para "20 de maio de 2026". */
export function formatarDataExtensa(data: string): string {
  const [ano, mes, dia] = data.split("-").map(Number);
  if (!ano || !mes || !dia) return data;

  // Meia-noite local: o mesmo motivo de formatarDataCurta.
  return new Date(ano, mes - 1, dia).toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** Deixa "sexta" como "Sexta" para inicio de frase. */
export function capitalizar(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/**
 * Acentos dos dias da semana.
 *
 * O backend grava os nomes sem acento ("terca", "sabado" — ver DIAS_SEMANA em
 * cupcam/gestao/turmas.py). Corrigimos na exibicao para o professor ler o
 * portugues correto, sem precisar alterar o dado ja gravado no banco.
 */
const DIAS_ACENTUADOS: Record<string, string> = {
  terca: "terça",
  sabado: "sábado",
};

/** Nome do dia da semana pronto para exibicao, acentuado e capitalizado. */
export function formatarDiaSemana(dia: string): string {
  return capitalizar(DIAS_ACENTUADOS[dia.toLowerCase()] ?? dia);
}

/**
 * Monta "8:00 - 9:30" a partir das horas da turma.
 *
 * Remove o zero a esquerda como no desenho das telas, mas preserva
 * "00:00" — sem essa excecao a meia-noite virava "0:00".
 */
export function formatarIntervalo(inicio: string, fim: string): string {
  const limpar = (hora: string) =>
    hora.startsWith("00:") ? hora : hora.replace(/^0/, "");
  return `${limpar(inicio)} - ${limpar(fim)}`;
}

/**
 * Extrai a data de um timestamp "AAAA-MM-DD HH:MM:SS".
 * Recorte de string, sem Date, pelo mesmo motivo de fuso horario.
 */
export function dataDoTimestamp(timestamp: string): string {
  return timestamp.split(" ")[0] ?? timestamp;
}

/** Extrai "HH:MM" de um timestamp "AAAA-MM-DD HH:MM:SS". */
export function horaDoTimestamp(timestamp: string): string {
  const hora = timestamp.split(" ")[1];
  return hora ? hora.slice(0, 5) : "";
}

/**
 * Formata porcentagem para exibicao.
 * Devolve null quando nao ha dado — a tela decide o que dizer no lugar,
 * porque "0%" significaria "medimos e deu zero", que e' outra afirmacao.
 */
export function formatarPct(valor: number | null): string | null {
  return valor === null ? null : `${Math.round(valor)}%`;
}
