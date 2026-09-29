import "server-only";

import { timingSafeEqual } from "node:crypto";

/**
 * Compara dois `state` do login em tempo constante. `===` pararia no primeiro
 * caractere diferente, e o tempo de resposta revelaria quanto do inicio esta
 * certo. O comprimento pode vazar sem problema (e' sempre 43).
 *
 * Modulo proprio porque /entrar (token vindo do Strix) e /entrar/tentar
 * (login pela tela de espera) conferem o state do mesmo jeito.
 */
export function statesIguais(recebido: string, esperado: string): boolean {
  const a = Buffer.from(recebido);
  const b = Buffer.from(esperado);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** O formato que /entrar/iniciar gera: 32 bytes em base64url = 43 caracteres. */
export const FORMATO_STATE = /^[A-Za-z0-9_-]{43}$/;
