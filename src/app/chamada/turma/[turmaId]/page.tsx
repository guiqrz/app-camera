import Link from "next/link";
import { notFound } from "next/navigation";

import { SeletorTurma } from "@/components/aulas/seletor-turma";
import { AppShell } from "@/components/layout/app-shell";
import { IconSeta } from "@/components/ui/icons";
import { ApiError, buscarAulasDaTurma, listarTurmas } from "@/lib/api";
import {
  formatarDataExtensa,
  formatarDiaSemana,
  formatarIntervalo,
} from "@/lib/format";

type Props = {
  params: Promise<{ turmaId: string }>;
};

/**
 * Escolha da aula para fazer chamada.
 *
 * A chamada e' sempre de UMA sessao; esta pagina lista as aulas da turma
 * (a em andamento no topo, em destaque) e cada uma leva para
 * /chamada/{sessaoId}.
 */
export default async function EscolherAulaChamadaPage({ params }: Props) {
  const { turmaId } = await params;
  const id = Number(turmaId);

  if (!Number.isInteger(id) || id <= 0) notFound();

  const [turmas, aulas] = await Promise.all([
    listarTurmas(),
    buscarAulasDaTurma(id).catch((causa) => {
      if (causa instanceof ApiError && causa.isNotFound) notFound();
      throw causa;
    }),
  ]);

  // Aula em andamento primeiro: e' o caso de uso principal da chamada.
  const ordenadas = [...aulas.aulas].sort(
    (a, b) => Number(b.em_andamento) - Number(a.em_andamento),
  );

  return (
    <AppShell
      titulo="Chamada"
      controles={
        <SeletorTurma turmas={turmas} turmaAtualId={id} baseRota="/chamada/turma" />
      }
    >
      <div className="flex flex-col gap-7">
        <div>
          <h1
            className="text-text text-2xl font-extrabold sm:text-3xl"
            style={{ fontFamily: "var(--font-geologica)" }}
          >
            Fazer Chamada
          </h1>
          <p className="text-text-body mt-1.5 text-sm">
            Escolha a aula da turma {aulas.turma.nome} para marcar as presenças.
          </p>
        </div>

        <div className="lg:hidden">
          <SeletorTurma turmas={turmas} turmaAtualId={id} baseRota="/chamada/turma" />
        </div>

        {ordenadas.length === 0 ? (
          <div className="border-border-default mx-auto max-w-lg rounded-2xl border border-dashed p-10 text-center">
            <h2 className="text-text text-lg font-extrabold">
              Nenhuma aula registrada
            </h2>
            <p className="text-text-body mt-3 text-sm leading-relaxed">
              Quando a Cupcam monitorar uma aula desta turma, ela aparece aqui
              para a chamada.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {ordenadas.map((aula) => (
              <li key={aula.sessao_id}>
                <Link
                  href={`/chamada/${aula.sessao_id}`}
                  className="flex items-center gap-4 rounded-2xl p-5 transition-shadow hover:shadow-md"
                  style={{
                    background: "var(--surface)",
                    border: aula.em_andamento
                      ? "1.5px solid var(--primary)"
                      : "1px solid var(--border)",
                    boxShadow: "var(--shadow-card)",
                  }}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="text-text text-sm font-extrabold sm:text-base">
                        {formatarDiaSemana(aula.dia_semana)},{" "}
                        {formatarDataExtensa(aula.data)}
                      </span>
                      {aula.em_andamento && (
                        <span
                          className="rounded-full px-2.5 py-0.5 text-[11px] font-extrabold tracking-wide uppercase"
                          style={{
                            background: "var(--ok-bg)",
                            color: "var(--ok-fg)",
                          }}
                        >
                          Em andamento
                        </span>
                      )}
                    </div>
                    <div className="text-text-muted mt-1 text-[13px]">
                      {formatarIntervalo(aula.hora_inicio, aula.hora_fim)}
                    </div>
                  </div>

                  <span
                    className="flex-none -rotate-90"
                    style={{ color: "var(--text-muted)" }}
                    aria-hidden
                  >
                    <IconSeta />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppShell>
  );
}
