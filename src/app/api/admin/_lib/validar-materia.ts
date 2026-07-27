import type { NovaMateria } from "@/lib/types";

/**
 * Valida o corpo de POST/PUT de materia nos proxies /api/admin/materias.
 *
 * `cor` ausente e' aceita e vira `null` no corpo repassado — o backend trata
 * omissao como "sem cor" (o PUT e' substituicao total), e o proxy nao pode
 * inventar um default diferente do que o cliente mandou.
 *
 * Nao valida se a cor esta na paleta: a lista fechada mora em CORES_MATERIA
 * (cupcam/gestao/materias.py) e duplica-la aqui criaria duas fontes da verdade
 * que divergem quando uma cor nova for adicionada. A checagem aqui e' so' de
 * FORMATO (string ou nulo); cor fora da paleta vira 422 do backend, com a
 * mensagem exata, e flui ate a tela.
 */
export function validarNovaMateria(dados: unknown): dados is NovaMateria {
  if (typeof dados !== "object" || dados === null) return false;
  const d = dados as Record<string, unknown>;
  const corValida = d.cor === undefined || d.cor === null || typeof d.cor === "string";
  return typeof d.nome === "string" && d.nome.trim() !== "" && corValida;
}
