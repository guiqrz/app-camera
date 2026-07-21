import { formatarPct } from "@/lib/format";
import type { RelatorioDaSessao } from "@/lib/types";

type PainelPresencaProps = {
  presenca: RelatorioDaSessao["presenca"];
};

/**
 * Resumo da chamada automatica no relatorio: presenca geral, detectados e
 * ausentes. So' contagens da turma — nunca engajamento por aluno.
 */
export function PainelPresenca({ presenca }: PainelPresencaProps) {
  const pct = formatarPct(presenca.pct);

  return (
    <div className="border-border-default bg-surface shadow-card rounded-2xl border p-5">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h3 className="text-text text-base font-extrabold">Chamada automática</h3>
        {pct && (
          <span
            className="rounded-full px-2.5 py-1 text-xs font-extrabold"
            style={{ background: "var(--ok-bg)", color: "var(--ok-fg)" }}
          >
            {pct} presente
          </span>
        )}
      </div>

      <dl className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <dt className="text-text-body text-sm">Alunos detectados</dt>
          <dd className="text-text text-sm font-extrabold">{presenca.detectados}</dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-text-body text-sm">Presentes</dt>
          <dd className="text-text text-sm font-extrabold">
            {presenca.presentes}
            <span className="text-text-muted font-semibold"> / {presenca.total}</span>
          </dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-text-body text-sm">Ausentes</dt>
          <dd
            className="text-sm font-extrabold"
            style={{ color: presenca.ausentes > 0 ? "var(--danger-fg)" : "var(--text)" }}
          >
            {presenca.ausentes}
          </dd>
        </div>
      </dl>
    </div>
  );
}
