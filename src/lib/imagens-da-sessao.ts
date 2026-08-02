/**
 * Miniaturas das imagens que o professor enviou NESTA sessao do navegador.
 *
 * O backend guarda so' o ROTULO do anexo ("foto.jpg"), nunca o arquivo — e' a
 * regra de privacidade do projeto. Entao a mensagem ja' gravada nao tem de
 * onde puxar a imagem: ela existe apenas enquanto o `File` escolhido continuar
 * em memoria.
 *
 * Este cache estende essa janela ate' o fim da navegacao: quem envia uma foto
 * a ve' na propria conversa, em vez de um chip com o nome do arquivo. Ao
 * recarregar a pagina o cache esvazia e a mensagem volta a mostrar so' o
 * rotulo — o comportamento honesto, ja' que o arquivo de fato nao existe mais.
 */

/** Teto de miniaturas vivas. Ver `guardarImagemDaSessao`. */
const LIMITE = 15;

/**
 * Chave -> URL de blob, em ordem de uso (Map preserva ordem de insercao).
 * Vive so' em memoria, nunca em disco.
 */
const miniaturas = new Map<string, string>();

/**
 * Chave da miniatura: a conversa MAIS o rotulo.
 *
 * So' o nome do arquivo nao serve. "IMG_0001.jpg", "foto.jpg" e
 * "Screenshot.png" se repetem o tempo todo, e com a chave global a foto do
 * quadro da turma 7A apareceria anexada a uma pergunta sobre a 3B — foto de
 * sala trocada entre turmas, que e' pior do que nao mostrar miniatura nenhuma.
 */
function chave(conversaId: number, rotulo: string): string {
  return `${conversaId}:${rotulo}`;
}

/**
 * Guarda a imagem recem-enviada para a bolha da mensagem poder mostra-la.
 *
 * O teto de `LIMITE` existe porque cada `createObjectURL` prende o arquivo
 * inteiro na memoria: sem ele, uma sessao de fotografar o quadro (dezenas de
 * imagens de alguns MB, sem nunca recarregar a pagina) acumularia tudo ate' a
 * aba travar. Passando do teto, a miniatura mais ANTIGA sai — e a mensagem
 * dela simplesmente volta a mostrar o selo com a extensao, que ja' e' o caso
 * de toda conversa reaberta depois de um refresh.
 */
export function guardarImagemDaSessao(conversaId: number, arquivo: File): void {
  if (!arquivo.type.startsWith("image/")) return;

  const k = chave(conversaId, arquivo.name);

  // Revoga a anterior de mesma chave: sem isso, reenviar a mesma foto varias
  // vezes acumularia blobs orfaos.
  const anterior = miniaturas.get(k);
  if (anterior) URL.revokeObjectURL(anterior);

  miniaturas.set(k, URL.createObjectURL(arquivo));

  while (miniaturas.size > LIMITE) {
    const maisAntiga = miniaturas.keys().next();
    if (maisAntiga.done) break;

    const url = miniaturas.get(maisAntiga.value);
    if (url) URL.revokeObjectURL(url);
    miniaturas.delete(maisAntiga.value);
  }
}

/** URL da miniatura, ou null se a imagem nao foi enviada nesta sessao. */
export function buscarImagemDaSessao(
  conversaId: number,
  rotulo: string,
): string | null {
  return miniaturas.get(chave(conversaId, rotulo)) ?? null;
}
