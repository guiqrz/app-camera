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
 *
 * A chave e' o nome do arquivo porque e' exatamente isso que o backend grava
 * como rotulo. Colisao (duas fotos "imagem.jpg" na mesma sessao) mostra a mais
 * recente; o custo e' baixo perto de exigir um identificador que o banco nao
 * tem.
 */

/** Rotulo -> URL de blob. Vive so' em memoria, nunca em disco. */
const miniaturas = new Map<string, string>();

/** Guarda a imagem recem-enviada para a bolha da mensagem poder mostra-la. */
export function guardarImagemDaSessao(arquivo: File): void {
  if (!arquivo.type.startsWith("image/")) return;

  // Revoga a anterior de mesmo nome: sem isso, reenviar a mesma foto varias
  // vezes acumularia blobs que so' sairiam no refresh.
  const anterior = miniaturas.get(arquivo.name);
  if (anterior) URL.revokeObjectURL(anterior);

  miniaturas.set(arquivo.name, URL.createObjectURL(arquivo));
}

/** URL da miniatura, ou null se a imagem nao foi enviada nesta sessao. */
export function buscarImagemDaSessao(rotulo: string): string | null {
  return miniaturas.get(rotulo) ?? null;
}
