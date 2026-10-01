/**
 * Funcoes puras do cartao do plano de aula do Cup AI (29/09/2026), separadas
 * do componente pra ter teste sem navegador (`npm test`).
 */

import type { BaseDaRecomendacao } from "./types.ts";

export type FormatoDoPlano = "pdf" | "docx";

/** Mesmos textos de ROTULO_DA_BASE em cupcam/planejamento/campos.py. */
export const ROTULO_DA_BASE: Record<BaseDaRecomendacao, string> = {
  onde_parou: "Onde a turma parou",
  engajamento: "Engajamento da turma",
  transcricao: "Suas últimas aulas",
};

export function urlDoArquivoDoPlano(planoId: number, formato: FormatoDoPlano): string {
  const consulta = new URLSearchParams({ formato });
  return `/api/ia/planos/${encodeURIComponent(String(planoId))}/arquivo?${consulta}`;
}

export function minutosTotais(plano: {
  campos: { metodologia: { minutos: number | null }[] };
}): number {
  return plano.campos.metodologia.reduce((total, etapa) => total + (etapa.minutos ?? 0), 0);
}

const DIAS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

/** "2026-10-06" -> "ter, 06/10". Sem fuso: a data e' do calendario, nao um instante. */
export function dataCurta(iso: string | null): string {
  if (!iso) return "sem data";
  const [ano, mes, dia] = iso.split("-").map(Number);
  const semana = new Date(Date.UTC(ano, mes - 1, dia)).getUTCDay();
  return `${DIAS[semana]}, ${String(dia).padStart(2, "0")}/${String(mes).padStart(2, "0")}`;
}
