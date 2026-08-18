import { AgendaSemana } from "@/components/aulas/agenda-semana";
import { CartaoNumero } from "@/components/aulas/cartao-numero";
import { DistribuicaoMaterias } from "@/components/aulas/distribuicao-materias";
import { SecaoLembretes } from "@/components/aulas/secao-lembretes";
import { SeletorTurma } from "@/components/aulas/seletor-turma";
import { AppShell } from "@/components/layout/app-shell";
import { IconPessoas, IconRelogio } from "@/components/ui/icons";
import { buscarVisaoGeral, listarTurmas } from "@/lib/api";

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
export default async function AulasPage() {
  const [turmas, visao] = await Promise.all([listarTurmas(), buscarVisaoGeral()]);

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

        <AgendaSemana semana={visao.semana} />

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
