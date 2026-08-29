import Link from "next/link";

import { IconRelatorios } from "@/components/ui/icons";

/**
 * As telas da turma que nao cabem no fluxo do dia a dia.
 *
 * Fim de periodo (F2) e' trabalho de FECHAMENTO do bimestre — feito duas vezes
 * por semestre, nao toda aula. Nao merece lugar no menu lateral, que e' pro que
 * ele usa todo dia, mas precisa de uma porta visivel: uma feature que so'
 * existe pra quem sabe a URL nao existe.
 */

const ATALHOS = [
  {
    href: "relatorios-periodo",
    rotulo: "Fim de período",
    descricao: "Rascunho do conselho de classe, a partir do que foi dado.",
    Icone: IconRelatorios,
  },
];

export function AtalhosDaTurma({ turmaId }: { turmaId: number }) {
  return (
    <nav aria-label="Telas da turma" className="grid gap-3">
      {ATALHOS.map(({ href, rotulo, descricao, Icone }) => (
        <Link
          key={href}
          href={`/aulas/${turmaId}/${href}`}
          className="flex items-center gap-3 rounded-[12px] px-[17px] py-[14px] transition-transform hover:-translate-y-px"
          style={{
            background: "var(--vidro-forte)",
            border: "1px solid var(--vidro-forte-borda)",
            backdropFilter: "blur(34px) saturate(170%)",
          }}
        >
          <span
            style={{
              width: 34,
              height: 34,
              flex: "none",
              borderRadius: 10,
              background: "var(--materia-roxo-bg)",
              color: "var(--materia-roxo-fg)",
              display: "grid",
              placeItems: "center",
            }}
            aria-hidden
          >
            <Icone size={16} />
          </span>

          <span className="min-w-0">
            <span
              className="block text-[13.5px] font-semibold"
              style={{ color: "var(--text)" }}
            >
              {rotulo}
            </span>
            <span
              className="block text-[12px] leading-snug"
              style={{ color: "var(--text-muted)" }}
            >
              {descricao}
            </span>
          </span>
        </Link>
      ))}
    </nav>
  );
}
