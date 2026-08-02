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

type Pendencia = {
  /** Conversa que deve receber estes anexos. */
  conversaId: number;
  anexos: Anexo[];
};

let pendencia: Pendencia | null = null;

/** Guarda os anexos que a conversa `conversaId` deve receber ao montar. */
export function guardarAnexosPendentes(
  conversaId: number,
  anexos: Anexo[],
): void {
  pendencia = { conversaId, anexos };
}

/**
 * Devolve os anexos guardados PARA ESTA conversa, e limpa a caixa.
 *
 * O id e' conferido, e nao so' consumido: se a navegacao pra conversa nova
 * nunca terminar (o professor clica na barra lateral no meio, ou a pagina
 * falha), a caixa fica cheia. Sem a conferencia, a PROXIMA conversa aberta —
 * uma antiga, sem relacao nenhuma — herdaria aqueles arquivos e os mandaria
 * pro modelo sem o professor ter escolhido nada. Anexo errado numa pergunta
 * errada e' pior do que anexo nenhum.
 *
 * A caixa e' limpa nos dois casos: pra conversa certa porque os anexos foram
 * entregues, e pra errada porque aquela pendencia ja' nao serve a ninguem.
 */
export function retirarAnexosPendentes(conversaId: number): Anexo[] {
  const guardada = pendencia;
  pendencia = null;

  if (guardada === null || guardada.conversaId !== conversaId) return [];
  return guardada.anexos;
}
