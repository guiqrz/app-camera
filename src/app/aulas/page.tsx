import { AgendaSemana } from "@/components/aulas/agenda-semana";
import { CartaoNumero } from "@/components/aulas/cartao-numero";
import { DistribuicaoMaterias } from "@/components/aulas/distribuicao-materias";
import { SecaoLembretes } from "@/components/aulas/secao-lembretes";
import { SeletorTurma } from "@/components/aulas/seletor-turma";
import { AppShell } from "@/components/layout/app-shell";
import { IconPessoas, IconRelogio } from "@/components/ui/icons";
import {
  buscarVisaoGeral,
  listarEventosDaAgenda,
  listarMaterias,
  listarTurmas,
} from "@/lib/api";

import { periodoDaAgenda } from "@/lib/semana";

import { AvisoSemTurmas } from "./aviso-sem-turmas";

// Sem parametro dinamico na rota, o Next tentaria pre-renderizar esta pagina em
// build time (SSG) e o build falharia se a API nao estivesse de pe. Mesmo
// motivo de /coordenacao.
export const dynamic = "force-dynamic";

export const metadata = { title: "Minhas aulas — Cupcam Insights" };

/** "13,4" em vez de "13.4": a tela e' em portugues. */
function formatarHoras(horas: number) {
  return horas.toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

/**
 * Tela "Minhas Aulas", estado "Todas as turmas".
 *
 * Ate 13/08/2026 esta rota so' redirecionava pra primeira turma. Agora ela tem
 * conteudo proprio — a visao consolidada — e /aulas/{id} continua sendo a
 * visao de UMA turma. O seletor no cabecalho navega entre as duas.
 */
type Props = {
  // No App Router a query string chega como Promise.
  searchParams: Promise<{ data?: string }>;
};

export default async function AulasPage({ searchParams }: Props) {
  const { data } = await searchParams;
  const periodo = periodoDaAgenda(data);

  const [turmas, visao, eventos, materias] = await Promise.all([
    listarTurmas(),
    // `data` (a semana que a tela esta mostrando) escolhe de qual ENCONTRO vem
    // plano e anexo — a grade em si e' a mesma toda semana, o que o professor
    // preparou nao (01/09/2026). Sem ela, o backend usa a semana corrente.
    buscarVisaoGeral(data),
    // Engole a falha: a agenda continua de pe sem os eventos, so' sem as
    // marcacoes daquela semana. Perder a grade inteira por causa deles seria
    // pior do que mostrar a grade sem eles.
    listarEventosDaAgenda(periodo).catch(() => []),
    // Alimentam o dropdown do modal de aula nova. Falha vira lista vazia: o
    // modal continua abrindo, so' com "Sem materia" como unica opcao.
    listarMaterias().catch(() => []),
  ]);

  if (turmas.length === 0) {
    return <AvisoSemTurmas />;
  }

  return (
    <AppShell
      titulo="Minhas aulas"
      controles={<SeletorTurma turmas={turmas} turmaAtualId={null} comOpcaoTodas />}
    >
      {/* Espelha o `.ativo` do prototipo: coluna com gap 12px. O titulo da tela
          NAO entra aqui — ele mora no cabecalho do AppShell, junto do seletor
          de turma, como no `.topo` do prototipo. */}
      <div className="flex flex-col gap-[13px]">
        <p
          className="text-text-body text-sm leading-[21px]"
          style={{ fontWeight: 300 }}
        >
          Sua semana e o total do que a Cupcam acompanhou até agora.
        </p>

        <div className="lg:hidden">
          <SeletorTurma turmas={turmas} turmaAtualId={null} comOpcaoTodas />
        </div>

        {/* `turmas` e `materias` aqui, e nao so' na tela de UMA turma: sem
            turma no topo pra herdar, o modal de aula nova e o de evento
            precisam perguntar em qual turma criar (29/08/2026). */}
        <AgendaSemana
          semana={visao.semana}
          turmas={turmas}
          materias={materias}
          eventos={eventos}
          data={data}
        />

        {/* O card "Lembretes" e o painel vivem juntos em `SecaoLembretes`:
            os dois leem a MESMA lista, entao criar um lembrete no painel
            atualiza a contagem do card na hora. Os outros tres numeros sao
            dado de servidor e entram como `children`, sem virar cliente. */}
        <SecaoLembretes
          lembretesIniciais={visao.lembretes}
          outrosNumeros={
            <>
              <DistribuicaoMaterias
                aulasPorMateria={visao.aulas_por_materia}
                total={visao.total_aulas}
                nota={`em ${visao.total_turmas} ${visao.total_turmas === 1 ? "turma" : "turmas"} · ${visao.total_materias} ${visao.total_materias === 1 ? "matéria" : "matérias"}`}
              />
              <CartaoNumero
                rotulo="Alunos"
                valor={visao.total_alunos}
                nota="cadastrados"
                icone={<IconPessoas size={21} />}
                cor="azul"
              />
              <CartaoNumero
                rotulo="Horas em sala"
                valor={formatarHoras(visao.horas_em_sala)}
                nota={
                  // Sessao que nunca encerrou fica de FORA da soma. Dizer isso
                  // e' obrigatorio: um numero que exclui algo em silencio mente.
                  visao.sessoes_em_aberto > 0
                    ? `${visao.sessoes_em_aberto} ${visao.sessoes_em_aberto === 1 ? "aula sem encerrar não entra" : "aulas sem encerrar não entram"} na conta`
                    : "somando as aulas encerradas"
                }
                icone={<IconRelogio size={21} />}
                cor="verde"
              />
            </>
          }
        />
      </div>
    </AppShell>
  );
}
