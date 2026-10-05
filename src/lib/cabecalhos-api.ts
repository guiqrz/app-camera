/**
 * Cabecalhos de toda chamada do servidor do app pra API do CUPCAM.
 *
 * Desde os papeis (03/10/2026) o backend exige a sessao de quem esta' logado
 * em TODA rota de dados: e' com ela que ele decide o papel (professor,
 * coordenacao, admin) e filtra o que e' de cada um. A chave sozinha so' prova
 * que quem chama e' o servidor do app.
 *
 * A sessao NUNCA vai pro notebook da camera: ele nao tem as sessoes de login
 * pra conferir (tabela so' da nuvem) e o tunel dele e' publico.
 *
 * Modulo puro (sem "server-only") pra ser testavel com `node --test`.
 */

export type DestinoDosCabecalhos = "nuvem" | "camera";

export function cabecalhosDaApi(
  destino: DestinoDosCabecalhos,
  apiKey: string,
  sessao: string | undefined,
): Record<string, string> {
  if (destino === "nuvem" && sessao) {
    return { "X-API-Key": apiKey, "X-Sessao": sessao };
  }
  return { "X-API-Key": apiKey };
}
