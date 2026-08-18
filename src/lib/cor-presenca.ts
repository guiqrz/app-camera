/**
 * Cor semaforica de uma porcentagem de PRESENCA.
 *
 * Uma funcao so' para as duas telas que pintam presenca (a barrinha de
 * frequencia por aluno e o comparativo da turma): com duas copias, mudar uma
 * faixa faria a mesma porcentagem sair verde num lugar e ambar no outro.
 *
 * Faixas: >= 80% bom, >= 50% atencao, abaixo disso critico. O corte de baixo
 * era 60 e ele mandou descer pra 50 em 16/08 — 50% e' "metade faltou", que e'
 * atencao real mas nao o mesmo alarme de 17%; vermelho nos dois igualava
 * casos bem diferentes. `null` e' "sem historico" — que NAO e' 0%: o aluno
 * pode ser novo na turma, e um vermelho ali afirmaria uma falta que ninguem
 * mediu.
 *
 * ARREDONDA antes de comparar, igual `formatarPct`: o comparativo da turma
 * chegou com 49.5, o numero na tela mostrava "50%" (Math.round) e a barra
 * saia vermelha — a cor discordava do que o professor lia. Sem o
 * arredondamento aqui, cor e numero podem divergir em qualquer faixa, nao so'
 * nesta.
 *
 * ⚠️ Isto e' PRESENCA, nunca engajamento. Atencao da turma e' medida so' por
 * turma e nunca vinculada a um RA — ver o JSDoc de `LinhaAluno`.
 */
export function corPresenca(pct: number | null): string {
  if (pct === null) return "var(--text-muted)";
  const arredondado = Math.round(pct);
  if (arredondado >= 80) return "var(--ok)";
  if (arredondado >= 50) return "var(--warn)";
  return "var(--danger)";
}

/**
 * Gradiente da barra preenchida sobre o trilho de vidro — o mesmo desenho do
 * "Chamada automática" no relatorio de sessao (`BlocoChamada`): a ponta
 * inicial mais transparente e' o que faz a barra ler como vidro tingido, e
 * nao uma chapa solida da cor. Ele pediu igualar em 16/08.
 */
export function gradientePresenca(pct: number | null): string {
  const cor = corPresenca(pct);
  return `linear-gradient(90deg, color-mix(in srgb, ${cor} 72%, transparent), ${cor})`;
}
