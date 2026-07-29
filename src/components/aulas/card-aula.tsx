import Link from "next/link";

import { IconSetaDireita } from "@/components/ui/icons";
import {
  aparenciaDoStatus,
  formatarDataCurta,
  formatarDiaSemana,
  formatarIntervalo,
} from "@/lib/format";
import type { AulaCard } from "@/lib/types";

type CardAulaProps = {
  aula: AulaCard;
  /** Id da turma, anexado ao link do relatorio como ?turma= para que a tela de
   *  destino saiba voltar pra ca. O relatorio de sessao so' recebe o *nome* da
   *  turma da API (`SessaoResumo.turma`), nunca o id. */
  turmaId: number;
  /** Nome da turma — o card do desenho mostra turma e horario juntos. */
  nomeTurma: string;
};

/**
 * Cartao de uma aula na tela "Minhas Aulas".
 *
 * Duas formas, conforme o Figma:
 * - computador: porcentagem grande no topo, resumo abaixo;
 * - celular: faixa colorida a esquerda com a porcentagem, texto a direita.
 *
 * Uma aula sem leitura de engajamento mostra "Sem dados", nunca "0%": zero
 * significaria turma inteiramente desatenta, que e' outra afirmacao.
 *
 * Horario e materia vem da aula da grade e sao nulos quando a sessao nao tem
 * aula associada (camera ligada na mao, ou aula excluida depois). Nesse caso a
 * legenda encolhe pra dia + data — nada de placeholder no lugar do horario.
 */
export function CardAula({ aula, turmaId, nomeTurma }: CardAulaProps) {
  const aparencia = aparenciaDoStatus(aula.status);
  const temDados = aula.engajamento_pct !== null;

  // Montada por partes porque as duas ultimas podem faltar; `filter(Boolean)`
  // tira o separador junto com o pedaco ausente.
  const legenda = [
    formatarDiaSemana(aula.dia_semana),
    formatarDataCurta(aula.data),
    formatarIntervalo(aula.hora_inicio, aula.hora_fim),
    aula.materia,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <article className="border-border-default bg-surface shadow-card flex overflow-hidden rounded-2xl border">
      {/* Faixa colorida — so' aparece no celular. */}
      <div
        className="flex w-[105px] flex-none items-center justify-center sm:hidden"
        style={{ background: aparencia.fundo }}
      >
        <span className="text-3xl font-extrabold" style={{ color: aparencia.texto }}>
          {temDados ? `${aula.engajamento_pct}%` : "—"}
        </span>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span
                className="hidden h-2.5 w-2.5 flex-none rounded-full sm:block"
                style={{ background: aparencia.cor }}
                aria-hidden
              />
              <h3 className="text-text truncate text-sm font-bold">{nomeTurma}</h3>
            </div>
            <p className="text-text-muted mt-0.5 text-xs">{legenda}</p>
          </div>

          {aula.em_andamento && (
            <span
              className="flex-none rounded-full px-2.5 py-1 text-[11px] font-extrabold"
              style={{ background: "var(--violet-100)", color: "var(--text-brand)" }}
            >
              Ao vivo
            </span>
          )}
        </div>

        {/* Porcentagem grande — so' no computador. */}
        <div className="hidden items-center gap-3 sm:flex">
          <span
            className="text-3xl font-extrabold"
            style={{ color: temDados ? aparencia.texto : "var(--text-muted)" }}
          >
            {temDados ? `${aula.engajamento_pct}%` : "Sem dados"}
          </span>
          <span className="bg-border-default h-px flex-1" aria-hidden />
        </div>

        {/* Badge de status — so' no celular, onde nao ha bolinha. */}
        <span
          className="w-fit rounded-full px-2.5 py-1 text-[11px] font-bold sm:hidden"
          style={{ background: aparencia.fundo, color: aparencia.texto }}
        >
          {aparencia.rotulo}
        </span>

        <p className="text-text-body line-clamp-3 text-xs leading-relaxed">
          {aula.resumo ?? "Esta aula ainda não gerou recomendações."}
        </p>

        {/* Dois caminhos a partir da aula. Numa aula ao vivo o professor quer
            marcar presenca, nao ler analise — por isso a chamada vira a acao
            principal ali, e sem esses links ele tinha que voltar ao menu e
            reselecionar a turma pra chegar na chamada desta mesma aula. */}
        <div className="mt-auto flex flex-wrap items-center gap-2">
          <Link
            href={`/chamada/${aula.sessao_id}?turma=${turmaId}`}
            className={`flex w-fit items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
              aula.em_andamento
                ? "text-white"
                : "text-text-brand border-border-default hover:bg-surface-2 border"
            }`}
            style={
              aula.em_andamento ? { background: "var(--primary)" } : undefined
            }
          >
            Fazer chamada
            <span className="sr-only"> da aula de {formatarDataCurta(aula.data)}</span>
          </Link>

          <Link
            href={`/relatorios/sessao/${aula.sessao_id}?turma=${turmaId}`}
            className="text-text-brand border-border-default hover:bg-surface-2 flex w-fit items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-bold transition-colors"
          >
            Ver análise
            <IconSetaDireita size={13} />
            {/* Contexto para leitor de tela, que ouviria so' "Ver análise". */}
            <span className="sr-only">
              {" "}
              da aula de {formatarDataCurta(aula.data)}
            </span>
          </Link>
        </div>
      </div>
    </article>
  );
}
