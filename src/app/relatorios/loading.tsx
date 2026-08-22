/**
 * Esqueleto de `/relatorios` enquanto o servidor busca as turmas.
 *
 * Mesma logica do `loading.tsx` de /chamada (22/08/2026): esta rota so'
 * encaminha para a turma padrao, e a propria page.tsx ja' usa este mesmo
 * esqueleto para o momento seguinte. Reexportar mantem os dois lados da
 * transicao identicos, sem duplicar markup.
 */
export { default } from "./turma/[turmaId]/loading";
