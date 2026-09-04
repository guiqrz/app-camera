/**
 * Le e valida o `?data=AAAA-MM-DD` das rotas de plano e material da aula.
 *
 * Plano e material pertencem ao ENCONTRO — o par (aula da grade, data) —, e nao
 * a' aula sozinha (01/09/2026): a grade se repete toda semana, o que o professor
 * prepara nao. Ver o cabecalho de `gestao/planos.py` no backend.
 *
 * A validacao acontece AQUI, e nao so' no backend, pelo mesmo motivo de
 * `validar-turma.ts`: a ponte devolve um erro em portugues que a tela mostra,
 * em vez de repassar o 422 cru da API.
 */

/** "AAAA-MM-DD" com mes 01-12 e dia 01-31. O calendario de verdade e' conferido abaixo. */
const FORMATO_ISO = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

export type DataDoEncontro =
  | { ok: true; data: string | undefined }
  | { ok: false; erro: string };

/**
 * Devolve a data do encontro, `undefined` quando o parametro nao veio, ou o
 * motivo da recusa.
 *
 * Ausente e' VALIDO: sem `?data=`, o backend usa o encontro da semana corrente,
 * que e' o que uma tela antiga faria. So' texto presente e torto e' recusado —
 * uma data invalida gravaria material num dia que a tela nunca vai ler.
 */
export function lerDataDoEncontro(requisicao: Request): DataDoEncontro {
  const bruto = new URL(requisicao.url).searchParams.get("data");
  if (bruto === null) return { ok: true, data: undefined };

  const data = bruto.trim();
  if (!FORMATO_ISO.test(data)) {
    return { ok: false, erro: "Data inválida." };
  }

  // O regex aceita 2026-02-31; o Date nao. Reconstruir e comparar pega o dia
  // que nao existe naquele mes — inclusive 29 de fevereiro fora do bissexto.
  const [ano, mes, dia] = data.split("-").map(Number);
  const calendario = new Date(Date.UTC(ano, mes - 1, dia));
  if (
    calendario.getUTCFullYear() !== ano ||
    calendario.getUTCMonth() !== mes - 1 ||
    calendario.getUTCDate() !== dia
  ) {
    return { ok: false, erro: "Data inválida." };
  }

  return { ok: true, data };
}
