/**
 * Modos da camera do lado do cliente: ids validos e textos de emergencia.
 *
 * A fonte da verdade e' o backend (`cupcam/modos.py`, servido em
 * GET /camera/modos) — e' de la' que vem o rotulo e o resumo que a tela mostra,
 * pra descricao e comportamento nunca divergirem.
 *
 * Este arquivo existe porque duas coisas precisam dos ids SEM depender de uma
 * requisicao: a validacao do corpo em `app/api/camera/modo/route.ts` e o
 * fallback da tela quando a API nao respondeu ainda (ou esta fora). Sem ele, o
 * professor ficaria sem os botoes justamente quando a conexao falha.
 *
 * Nao importa de `lib/api.ts`: aquele modulo e' server-only, e isto roda
 * tambem no cliente.
 */

import type { ModoCamera, ModoCameraInfo } from "./types";

/** Ids validos, na ordem de exibicao. Espelha modos.MODOS do backend. */
export const MODOS_CAMERA = ["aula", "descanso", "prova"] as const;

/** Modo em que toda captura comeca. Espelha modos.PADRAO do backend. */
export const MODO_PADRAO: ModoCamera = "aula";

/**
 * Textos de emergencia, usados so' enquanto GET /camera/modos nao respondeu.
 * Mantidos curtos e na lingua do professor, iguais aos do backend.
 */
export const MODOS_CAMERA_FALLBACK: ModoCameraInfo[] = [
  { id: "aula", rotulo: "Aula", resumo: "Presença e atenção da turma.", mede_atencao: true },
  { id: "descanso", rotulo: "Descanso", resumo: "Só a presença. Para aula livre.", mede_atencao: false },
  { id: "prova", rotulo: "Prova", resumo: "Presença e celular, sem medir atenção.", mede_atencao: false },
];

/** True se `valor` e' um modo conhecido. */
export function ehModoCamera(valor: unknown): valor is ModoCamera {
  return typeof valor === "string" && (MODOS_CAMERA as readonly string[]).includes(valor);
}
