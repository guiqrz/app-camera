/**
 * Esqueleto de `/chamada` enquanto o servidor busca as turmas.
 *
 * POR QUE REEXPORTA em vez de ter markup proprio (22/08/2026):
 *
 * `/chamada` nao tem tela propria — ela so' encaminha para a turma padrao do
 * professor, e o que aparece durante esse pulo ja' e' o esqueleto da escolha
 * de aula. A propria page.tsx importa esse mesmo componente para mostrar
 * DEPOIS que a API responde; aqui ele cobre o pedaco de ANTES.
 *
 * Sem este arquivo o Next segurava a navegacao inteira ate `listarTurmas()`
 * voltar: o clique em "Chamada" no menu nao produzia reacao nenhuma. Com ele
 * a tela troca na hora e o esqueleto e' o mesmo dos dois lados, entao a
 * transicao nao pisca.
 */
export { default } from "./turma/[turmaId]/loading";
