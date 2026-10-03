/**
 * Texto da aba Equipe. Modulo PURO (sem React, sem Next, sem alias `@/`) pra
 * rodar direto no `node --test`.
 *
 * `podeVerEquipe` so' decide se a ABA aparece. Quem barra de verdade e' o
 * backend (gestao/equipe.py): uma coordenacao com o menu "hackeado" chega na
 * rota e leva 403 do mesmo jeito.
 */

export function podeVerEquipe(papel: string): boolean {
  return papel === "admin" || papel === "coordenacao";
}

const HORA_MS = 60 * 60 * 1000;

/**
 * Quanto falta pro link vencer. As datas do backend sao ISO sem fuso (hora
 * local do servidor): `new Date("2026-09-27T10:00:00")` le como hora local,
 * que e' o mesmo relogio.
 */
export function prazoRestante(expiraEm: string, agora: Date): string {
  const restanteMs = new Date(expiraEm).getTime() - agora.getTime();
  if (restanteMs <= 0) return "vencido";
  if (restanteMs < HORA_MS) return "vence em menos de 1 hora";
  if (restanteMs < 24 * HORA_MS) {
    const horas = Math.floor(restanteMs / HORA_MS);
    return `vence em ${horas} ${horas === 1 ? "hora" : "horas"}`;
  }
  const dias = Math.floor(restanteMs / (24 * HORA_MS));
  return dias === 1 ? "vence amanhã" : `vence em ${dias} dias`;
}

/** "2026-09-27T23:59:00" -> "27/09/2026", lendo o texto (sem converter fuso). */
export function dataCurta(iso: string): string {
  const [ano, mes, dia] = iso.slice(0, 10).split("-");
  return `${dia}/${mes}/${ano}`;
}
