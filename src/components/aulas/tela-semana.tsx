import { SeletorTurma } from "@/components/aulas/seletor-turma";
import { VistaSemana } from "@/components/aulas/vista-semana";
import { AppShell } from "@/components/layout/app-shell";
import { buscarPreparacaoDaSemana, listarTurmas } from "@/lib/api";

/**
 * O corpo da tela "Minha semana" (feature F12).
 *
 * Vive num componente proprio porque a tela tem DUAS rotas: `/semana` (todas
 * as turmas) e `/semana/{id}` (uma turma). Elas so' diferem no id, e o
 * SeletorTurma navega por caminho — mesmo padrao de `/aulas`.
 */
export async function TelaSemana({
  turmaId,
  data,
}: {
  /** undefined = todas as turmas, que e' a visao de quem da' aula em varias. */
  turmaId?: number;
  /** Qualquer dia da semana desejada. undefined = a semana de hoje. */
  data?: string;
}) {
  const [turmas, semana] = await Promise.all([
    listarTurmas(),
    buscarPreparacaoDaSemana({ turmaId, data }),
  ]);

  const seletor = (
    <SeletorTurma
      turmas={turmas}
      turmaAtualId={turmaId ?? null}
      comOpcaoTodas
      baseRota="/semana"
    />
  );

  return (
    <AppShell titulo="Minha semana" controles={seletor}>
      <div className="flex flex-col gap-[13px]">
        <p
          className="text-text-body ml-[17px] max-w-[62ch] text-sm leading-[1.5]"
          style={{ fontWeight: 300 }}
        >
          {turmaId
            ? "As aulas desta turma nesta semana e o que falta preparar."
            : "Todas as suas aulas desta semana e o que falta preparar."}
        </p>

        {/* O seletor tambem aparece aqui no celular, onde o cabecalho e' enxuto. */}
        <div className="lg:hidden">{seletor}</div>

        <VistaSemana semana={semana} />
      </div>
    </AppShell>
  );
}

/** Data no formato AAAA-MM-DD, ou undefined (= a semana de hoje). */
export function lerDataDaSemana(bruto: string | undefined): string | undefined {
  return bruto && /^\d{4}-\d{2}-\d{2}$/.test(bruto) ? bruto : undefined;
}
