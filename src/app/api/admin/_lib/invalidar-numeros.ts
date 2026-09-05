import { revalidateTag } from "next/cache";

import { TAG_NUMEROS_GERAIS } from "@/lib/api";

/**
 * Derruba o cache dos numeros do topo de "Minhas Aulas".
 *
 * POR QUE EXISTE: `buscarNumerosGerais` e' cacheada por 300s porque esses
 * numeros custam 3,0s contra o Turso e quase nunca mudam (medido em
 * 05/09/2026). Mas quando eles MUDAM, o professor precisa ver na hora — ele
 * acabou de cadastrar o aluno e o total ainda diz o numero antigo.
 *
 * Chamar isto depois de escrever e' o que permite ter as duas coisas: cache
 * longo e numero sempre certo. Sem a etiqueta seria preciso escolher entre
 * rapido e correto, e a escolha por tempo erra dos dois lados — lenta demais
 * pro professor, curta demais pro Turso.
 *
 * ONDE CHAMAR: em toda ponte de escrita que mexa em ALUNO, TURMA, MATERIA ou no
 * vinculo aula-materia — depois do sucesso e nunca antes (invalidar o cache pra
 * depois a escrita falhar joga fora um cache bom por nada).
 *
 * A lista de materias entra, ao contrario do que parece: o donut le'
 * `m.nome` por LEFT JOIN ate' `materias`, entao RENOMEAR uma materia troca o
 * rotulo de uma fatia; e `total_materias` conta as materias COM sessao, entao
 * vincular uma aula a uma materia muda o numero. Conferido no SQL de
 * montar_numeros_gerais, nao suposto.
 */
export function invalidarNumerosGerais() {
  // `{ expire: 0 }` e' o segundo argumento que o Next 16 passou a exigir: ele
  // diz por quanto tempo a entrada velha ainda pode ser servida enquanto a nova
  // e' buscada. Zero = o proximo acesso ja' busca de novo, que e' o unico
  // comportamento util aqui — o professor acabou de cadastrar o aluno e a tela
  // nao pode responder com o total anterior.
  revalidateTag(TAG_NUMEROS_GERAIS, { expire: 0 });
}
