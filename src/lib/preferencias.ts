/**
 * Preferencias que vivem SO' no navegador (localStorage), sem backend.
 *
 * Sao atalhos de conveniencia, nao configuracao do sistema: se o storage
 * estiver bloqueado ou o valor for lixo, tudo cai num padrao seguro e o app
 * segue funcionando igual. Nada aqui pode quebrar uma tela.
 */

const CHAVE_TURMA_PADRAO = "cupcam-turma-padrao";

/**
 * Id da turma que Chamada e Relatorios devem abrir por padrao, ou null para
 * "perguntar sempre" (o comportamento atual: cai na primeira da lista).
 *
 * Devolve null tambem quando o valor salvo nao e' um id valido — uma turma
 * excluida deixa lixo no storage, e um id invalido nao pode virar navegacao
 * pra uma rota que nao existe.
 */
export function lerTurmaPadrao(): number | null {
  try {
    const bruto = localStorage.getItem(CHAVE_TURMA_PADRAO);
    if (bruto === null) return null;

    const id = Number(bruto);
    return Number.isInteger(id) && id > 0 ? id : null;
  } catch {
    // localStorage bloqueado (modo anonimo restrito).
    return null;
  }
}

/** Grava a turma padrao. `null` limpa a preferencia ("perguntar sempre"). */
export function definirTurmaPadrao(id: number | null): void {
  try {
    if (id === null) {
      localStorage.removeItem(CHAVE_TURMA_PADRAO);
    } else {
      localStorage.setItem(CHAVE_TURMA_PADRAO, String(id));
    }
  } catch {
    // localStorage bloqueado: a escolha vale so' nesta visita.
  }
}
