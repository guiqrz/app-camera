/**
 * Preferencia "sempre iniciar a camera gravando audio".
 *
 * Vive no localStorage (nao no servidor) porque e' escolha do professor NAQUELE
 * navegador, como a turma padrao. Uma escola com dois professores no mesmo
 * computador nao herda a decisao um do outro sem querer.
 *
 * O que ela faz: define como o controle do microfone COMECA marcado na tela de
 * Camera. Nao liga gravacao sozinha — o professor ainda ve o estado antes de
 * clicar Ligar. Ver a spec de 30/07/2026: consentimento visivel e' o motivo da
 * feature existir.
 *
 * A camera automatica (que sobe por horario, sem navegador) NAO e' afetada:
 * la' vale CUPCAM_AUDIO_ATIVO do .env.
 */

const CHAVE = "cupcam:sempre-gravar-audio";

/** True se o professor pediu pra sempre comecar gravando. Padrao: false. */
export function lerSempreGravar(): boolean {
  try {
    return localStorage.getItem(CHAVE) === "1";
  } catch {
    // localStorage indisponivel (modo privado, storage cheio): cai no seguro.
    return false;
  }
}

export function salvarSempreGravar(valor: boolean): void {
  try {
    localStorage.setItem(CHAVE, valor ? "1" : "0");
  } catch {
    // Nao poder salvar a preferencia nao pode quebrar a tela.
  }
}
