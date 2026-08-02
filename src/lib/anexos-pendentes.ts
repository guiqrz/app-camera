import type { Anexo } from "@/lib/types";

/**
 * Anexos escolhidos ANTES de a conversa existir, guardados ate' a tela da
 * conversa montar.
 *
 * Por que um modulo e nao a URL: comecar uma conversa sao duas telas — a
 * abertura cria a conversa e navega pra /ia/{id}, que e' quem de fato envia a
 * pergunta. A aula atravessa isso como `?sessao=` porque e' so' um numero, mas
 * um `File` nao cabe numa URL nem sobrevive a `JSON.stringify`.
 *
 * Por que nao sessionStorage: `File` tambem nao e' serializavel ali. O objeto
 * precisa continuar sendo o MESMO em memoria, e o `router.push` do Next e' uma
 * navegacao no cliente — a pagina nao recarrega, entao o modulo persiste.
 *
 * Um recarregamento de verdade (F5) esvazia isto, e e' o comportamento certo:
 * o professor nao esperaria que um arquivo escolhido antes do refresh
 * continuasse anexado.
 */

let pendentes: Anexo[] = [];

/** Guarda os anexos que a proxima tela de conversa deve receber. */
export function guardarAnexosPendentes(anexos: Anexo[]): void {
  pendentes = anexos;
}

/**
 * Devolve os anexos guardados e LIMPA a caixa.
 *
 * Consumo unico de proposito: sem isso, abrir outra conversa depois herdaria
 * os arquivos da anterior, e o professor mandaria a prova errada sem ver.
 */
export function retirarAnexosPendentes(): Anexo[] {
  const guardados = pendentes;
  pendentes = [];
  return guardados;
}
