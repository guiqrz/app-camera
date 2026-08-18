import { CardAoVivo } from "@/components/relatorio/card-ao-vivo";
import { GradeAulas } from "@/components/relatorio/grade-aulas";
import { dataDoTimestamp, formatarDataExtensa } from "@/lib/format";
import type { ResumoTurma } from "@/lib/consolidar";
import type { AulaCard } from "@/lib/types";

type VistaRelatorioGeralProps = {
  resumo: ResumoTurma;
  nomeTurma: string;
  /** Id da turma desta pagina — o card ao vivo so' aparece se a aula em curso
   *  for desta turma. */
  turmaId: number;
  /** Aulas da turma, para a grade de cards com busca e filtros. */
  aulas: AulaCard[];
};

/**
 * Tela Relatorios: a lista de aulas da turma, com busca, filtros e as 4
 * visualizacoes.
 *
 * E' a tela por onde o professor ESCOLHE uma aula pra abrir — nao um painel de
 * numeros. O consolidado da turma (medias, tendencia, distribuicao) mora em
 * Minhas aulas.
 */
export function VistaRelatorioGeral({
  resumo,
  nomeTurma,
  turmaId,
  aulas,
}: VistaRelatorioGeralProps) {
  const periodo =
    resumo.periodo.primeira && resumo.periodo.ultima
      ? `${formatarDataExtensa(
          dataDoTimestamp(resumo.periodo.primeira),
        )} — ${formatarDataExtensa(dataDoTimestamp(resumo.periodo.ultima))}`
      : "Sem aulas registradas";

  return (
    // gap 13px, como o `.ativo` do prototipo — o titulo da tela mora no
    // cabecalho do AppShell, entao aqui a coluna comeca pela legenda.
    <div className="flex flex-col gap-[13px]">
      <CardAoVivo turmaId={turmaId} />

      <p
        className="text-text-body ml-[17px] text-sm"
        style={{ fontWeight: 300 }}
      >
        Todas as aulas de {nomeTurma} que a Cupcam acompanhou. {periodo}.
      </p>

      {/* A grade de aulas e' TODO o conteudo da tela.
          A "visao geral" que ficava aqui embaixo — 5 cartoes de numero, o
          grafico de tendencia e a distribuicao das aulas — saiu em 14/08 a
          pedido dele: no prototipo a tela de Relatorios tem filtros, contagem
          e a grade, e mais nada. Os numeros consolidados nao sao perda: eles
          vivem na tela Minhas aulas, que e' a de visao geral. Aqui a pergunta
          e' "qual aula eu quero abrir?", e a grade e' a resposta inteira. */}
      <GradeAulas aulas={aulas} turmaId={turmaId} />
    </div>
  );
}
