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
export const MODOS_CAMERA = ["aula", "descanso", "prova", "lousa"] as const;

/** Modo em que toda captura comeca. Espelha modos.PADRAO do backend. */
export const MODO_PADRAO: ModoCamera = "aula";

/**
 * Textos de emergencia, usados so' enquanto GET /camera/modos nao respondeu.
 *
 * Copia literal de DESCRICOES e CORES em cupcam/modos.py — se divergirem, o
 * professor sem conexao le uma descricao que nao corresponde ao que a camera
 * faz, que e' pior do que nao ler nada. A fonte da verdade continua sendo o
 * backend; isto so' cobre a janela ate' a resposta chegar.
 */
export const MODOS_CAMERA_FALLBACK: ModoCameraInfo[] = [
  {
    id: "aula",
    rotulo: "Aula",
    resumo: "Presença e atenção.",
    detalhe:
      "O modo normal de uma aula expositiva. A câmera marca a presença e mede a atenção da turma, gerando o engajamento que aparece nos relatórios.",
    cor: "roxo",
    mede_atencao: true,
  },
  {
    id: "descanso",
    rotulo: "Descanso",
    resumo: "Só a presença.",
    detalhe:
      "Para aula livre, trabalho em grupo ou intervalo — momentos em que você não está passando conteúdo. A presença continua sendo marcada, mas a atenção não é medida nem gravada, porque não haveria aula para se distrair dela.",
    cor: "ambar",
    mede_atencao: false,
  },
  {
    id: "prova",
    rotulo: "Prova",
    resumo: "Presença e celular.",
    detalhe:
      "Para avaliações. A presença é marcada e o celular continua sendo detectado, mas a atenção não é medida: durante uma prova o aluno olha para baixo porque está escrevendo, e isso seria contado como distração.",
    cor: "azul",
    mede_atencao: false,
  },
  {
    id: "lousa",
    rotulo: "Lousa",
    resumo: "Guarda o quadro.",
    detalhe:
      'Para registrar o que você escreveu no quadro. Ao apertar "Capturar quadro", a câmera guarda uma foto do quadro na aula e lê o que está escrito nela. A presença continua sendo marcada, mas a atenção não é medida enquanto este modo está ativo — a câmera está olhando para o quadro, não para a turma. O engajamento já registrado da aula não é apagado.',
    cor: "verde",
    mede_atencao: false,
  },
];

/** True se `valor` e' um modo conhecido. */
export function ehModoCamera(valor: unknown): valor is ModoCamera {
  return typeof valor === "string" && (MODOS_CAMERA as readonly string[]).includes(valor);
}
