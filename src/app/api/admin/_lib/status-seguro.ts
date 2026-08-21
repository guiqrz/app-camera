import type { ApiError } from "@/lib/api";

/**
 * Allowlist de status HTTP da API do CUPCAM que fazem sentido repassar cru
 * pro navegador — sao respostas de negocio, nao de infraestrutura.
 */
const STATUS_PERMITIDOS = new Set([404, 409, 413, 422]);

/**
 * Mapeia o status de uma `ApiError` pro status que a rota deve devolver ao
 * navegador nos ramos genericos (erro nao tratado por um `if` mais especifico).
 *
 * Por que existe: 401/403 da API do CUPCAM significam que a CUPCAM_API_KEY do
 * SERVIDOR esta errada/expirada — um problema de configuracao nosso, nao do
 * usuario. Repassar 401/403 cru faria o navegador achar que o proprio usuario
 * nao esta autenticado (ele nem tem sessao com a API do CUPCAM: quem loga
 * la e' esta rota, com a chave). `0` (rede fora do ar) tambem nao e' algo que
 * o usuario causou. Qualquer status fora da allowlist de negocio (404, 409,
 * 413, 422) vira 502 por seguranca — nunca vaza detalhe de infraestrutura.
 */
export function statusSeguro(causa: ApiError): number {
  if (STATUS_PERMITIDOS.has(causa.status)) return causa.status;
  // O computador da sala nao respondeu: 503 (temporariamente indisponivel), e
  // nao 502. Nao e' infraestrutura quebrada — fora do horario de aula, um
  // notebook desligado e' o estado esperado. O status distinto deixa a tela de
  // Camera reconhecer o caso sem depender do texto da mensagem.
  if (causa.isCameraOffline) return 503;
  return 502;
}

/**
 * Mensagem pro professor quando o computador da sala nao respondeu, ou `null`
 * quando a falha e' outra (o chamador segue com a mensagem dele).
 *
 * Existe pra que as sete rotas de camera digam a MESMA coisa nesse caso: a
 * causa e' sempre a mesma maquina desligada, e a acao tambem — ligar o CUPCAM
 * na sala. Sem isso, cada rota inventaria a propria frase pro mesmo problema.
 */
export function mensagemDeCameraOffline(causa: ApiError): string | null {
  if (!causa.isCameraOffline) return null;
  return "O computador da sala não está conectado. Ligue o CUPCAM nessa máquina.";
}
