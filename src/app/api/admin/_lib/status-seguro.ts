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
  return 502;
}
