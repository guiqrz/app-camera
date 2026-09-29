/**
 * Download de arquivo gerado no servidor, no navegador.
 *
 * Compartilhado pelo "Baixar" das respostas do Cup AI e pelo cartao da lista de
 * exercicios. Nao importa nada de servidor: e' seguro em componente "use client".
 */

/**
 * Baixa um Blob pelo caminho de object URL: cria, clica, revoga.
 *
 * Sem o revoke o blob fica vivo ate' a aba fechar. Numa conversa longa, baixar
 * varios arquivos seguraria todos eles na memoria.
 */
export function baixarBlob(blob: Blob, nomeArquivo: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = nomeArquivo;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/**
 * Nome do arquivo que a API mandou no `Content-Disposition`, ou `padrao`.
 *
 * A API ja' sanitiza o nome (so' letra, numero, espaco e hifen); aqui so' se
 * le' o que esta' entre as aspas de `filename="..."`.
 */
export function nomeDoArquivoDoCabecalho(cabecalho: string | null, padrao: string): string {
  const nome = cabecalho?.match(/filename="([^"]+)"/)?.[1]?.trim();
  return nome ? nome : padrao;
}
