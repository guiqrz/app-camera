/**
 * Formatacao de datas, horarios e faixas de engajamento.
 *
 * Centralizado aqui para que toda tela mostre o mesmo dado do mesmo jeito.
 */

import type { CorMateria, StatusEngajamento } from "./types";

/**
 * Cores de materia, na ordem em que aparecem no seletor.
 *
 * `id` e' o que vai pro banco (espelha CORES_MATERIA em
 * cupcam/gestao/materias.py); `fundo`/`texto` sao os tokens que o tema claro e
 * o escuro definem em styles/semantic.css. Nenhum valor de cor e' escrito
 * direto no componente — trocar a paleta acontece no CSS, num lugar so'.
 */
export const CORES_MATERIA: readonly {
  id: CorMateria;
  rotulo: string;
  fundo: string;
  texto: string;
}[] = [
  { id: "azul", rotulo: "Azul", fundo: "var(--materia-azul-bg)", texto: "var(--materia-azul-fg)" },
  { id: "verde", rotulo: "Verde", fundo: "var(--materia-verde-bg)", texto: "var(--materia-verde-fg)" },
  { id: "ambar", rotulo: "Âmbar", fundo: "var(--materia-ambar-bg)", texto: "var(--materia-ambar-fg)" },
  { id: "vermelho", rotulo: "Vermelho", fundo: "var(--materia-vermelho-bg)", texto: "var(--materia-vermelho-fg)" },
  { id: "roxo", rotulo: "Roxo", fundo: "var(--materia-roxo-bg)", texto: "var(--materia-roxo-fg)" },
  { id: "rosa", rotulo: "Rosa", fundo: "var(--materia-rosa-bg)", texto: "var(--materia-rosa-fg)" },
  { id: "ciano", rotulo: "Ciano", fundo: "var(--materia-ciano-bg)", texto: "var(--materia-ciano-fg)" },
  { id: "cinza", rotulo: "Cinza", fundo: "var(--materia-cinza-bg)", texto: "var(--materia-cinza-fg)" },
] as const;

/**
 * Estilo do grifo de uma materia. `null` (sem cor, ou sem materia) devolve
 * `null` — a tela mostra o nome sem grifo nenhum, que e' diferente de mostrar
 * um grifo neutro.
 *
 * Cor desconhecida (banco com valor que esta paleta nao tem, vindo de uma
 * versao futura) tambem cai em `null` em vez de quebrar a tela.
 */
export function aparenciaDaCorMateria(
  cor: CorMateria | null,
): { fundo: string; texto: string } | null {
  if (cor === null) return null;
  const encontrada = CORES_MATERIA.find((opcao) => opcao.id === cor);
  return encontrada ? { fundo: encontrada.fundo, texto: encontrada.texto } : null;
}

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
 * Monta "8:00 - 9:30" a partir das horas da aula.
 *
 * Remove o zero a esquerda como no desenho das telas, mas preserva
 * "00:00" — sem essa excecao a meia-noite virava "0:00".
 *
 * Devolve `null` quando falta qualquer uma das pontas: uma sessao iniciada com
 * a camera na mao (ou cuja aula foi excluida depois) nao tem horario nenhum, e
 * a tela deve OMITIR o pedaco em vez de inventar um placeholder — "—:—" leria
 * como se o horario existisse e nao tivesse sido carregado.
 */
export function formatarIntervalo(
  inicio: string | null,
  fim: string | null,
): string | null {
  if (!inicio || !fim) return null;
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

/**
 * Ha quanto tempo a captura esta no ar, a partir de `sessoes.iniciada_em`.
 *
 * O timestamp vem do backend como "AAAA-MM-DD HH:MM:SS" em horario LOCAL da
 * maquina que roda a camera (o SQLite grava com `datetime('now','localtime')`).
 * Por isso ele e' montado campo a campo com `new Date(ano, mes, ...)`, que
 * interpreta como local: passar a string crua pro construtor faria o navegador
 * ler "AAAA-MM-DDTHH:MM:SS" como UTC em alguns motores, e a duracao sairia
 * deslocada pelo fuso — 3 horas de erro no Brasil.
 *
 * Devolve null quando nao da' pra afirmar: sem timestamp, timestamp corrompido,
 * ou relogio adiantado (inicio no futuro). Null e' a tela nao mostrar duracao
 * nenhuma, que e' melhor que mostrar "ha -3 h".
 */
export function duracaoDesde(
  iniciadaEm: string | null | undefined,
  agora: Date = new Date(),
): string | null {
  if (!iniciadaEm) return null;

  const [data, hora] = iniciadaEm.split(" ");
  if (!data || !hora) return null;

  const [ano, mes, dia] = data.split("-").map(Number);
  const [h, m, s] = hora.split(":").map(Number);
  if ([ano, mes, dia, h, m].some((n) => !Number.isFinite(n))) return null;

  const inicio = new Date(ano, mes - 1, dia, h, m, s || 0);
  if (Number.isNaN(inicio.getTime())) return null;

  const minutos = Math.floor((agora.getTime() - inicio.getTime()) / 60000);
  // Relogio adiantado ou estado de outra maquina: nao inventa "ha 0 min".
  if (minutos < 0) return null;
  if (minutos < 1) return "agora há pouco";
  if (minutos < 60) return `há ${minutos} min`;

  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  if (horas < 24) {
    return resto === 0 ? `há ${horas} h` : `há ${horas} h ${resto} min`;
  }

  const dias = Math.floor(horas / 24);
  return dias === 1 ? "há 1 dia" : `há ${dias} dias`;
}
