"use client";

import { BotaoIcone } from "@/components/ui/botao-icone";
import { IconLapis, IconLixeira, IconMais, IconTurma } from "@/components/ui/icons";
import { formatarPct } from "@/lib/format";
import type { TurmaPanorama } from "@/lib/types";

type PainelTurmasProps = {
  /** Turmas já em ordem alfabética, como o backend devolve. Ver o aviso abaixo. */
  turmas: TurmaPanorama[];
  selecionadaId: number | null;
  aoSelecionar: (turmaId: number) => void;
  aoNovaTurma: () => void;
  aoExcluirTurma: (turma: TurmaPanorama) => void;
};

/**
 * Lista de turmas cadastradas, a coluna esquerda da tela Coordenacao.
 *
 * Componente burro: so' recebe dados e callbacks da vista, nao busca nem
 * grava nada sozinho. Cada turma seleciona ao clicar e traz duas acoes.
 *
 * Editar e' um LINK, nao um callback: a edicao virou pagina propria
 * (`/coordenacao/turmas/{id}`), onde a turma aparece junto da grade semanal de
 * aulas. Como link de verdade, ganha de graca o "abrir em nova aba" e o
 * prefetch do Next — que um botao com router.push nao daria.
 *
 * ⚠️ A ORDEM E' ALFABETICA E NAO PODE VIRAR ORDENACAO POR DESEMPENHO.
 * A lista mostra `frequencia_media_pct` por turma (decisao explicita do
 * usuario em 16/08/2026), mas ordenar por ela transformaria a tela num ranking
 * de turmas e, como cada turma tem um professor atras, num ranking de
 * professores — proibido pelo CLAUDE.md. Pelo mesmo motivo a porcentagem nao
 * recebe cor semaforica nem seta de tendencia: cor e seta sao o que transforma
 * um numero em juizo. Ha teste travando a ordem no backend.
 */
export function PainelTurmas({
  turmas,
  selecionadaId,
  aoSelecionar,
  aoNovaTurma,
  aoExcluirTurma,
}: PainelTurmasProps) {
  return (
    <section className="coord-painel">
      <div className="coord-painel-topo">
        <h2 className="coord-painel-titulo">Turmas</h2>
        <button type="button" onClick={aoNovaTurma} className="btn-acao vidro centrado">
          <IconMais size={14} />
          Nova turma
        </button>
      </div>

      {turmas.length === 0 ? (
        <div className="coord-vazio">
          <span className="coord-vazio-icone" aria-hidden>
            <IconTurma size={26} />
          </span>
          <p className="coord-vazio-titulo">Nenhuma turma cadastrada ainda.</p>
          <p className="coord-vazio-apoio">
            Crie uma turma para começar a cadastrar alunos.
          </p>
        </div>
      ) : (
        <ul className="coord-turmas">
          {turmas.map((turma) => {
            const selecionada = turma.id === selecionadaId;
            return (
              <li
                key={turma.id}
                className="coord-turma"
                data-selecionada={selecionada ? "sim" : "nao"}
              >
                {/* Selecionar a turma — botao principal, ocupa a linha toda. */}
                <button
                  type="button"
                  onClick={() => aoSelecionar(turma.id)}
                  aria-current={selecionada ? "true" : undefined}
                  className="coord-turma-botao"
                >
                  <span className="coord-turma-nome">{turma.nome}</span>
                  {/* Turma e' so' identidade: nome + sala. Dia e horario vivem
                      nas aulas dela, na pagina da turma. */}
                  <span className="coord-turma-sala">{turma.sala_id}</span>

                  {/* Os tres numeros que dizem se a turma esta PRONTA pra ser
                      monitorada: quem esta nela, quando ela acontece, e se a
                      camera ja' rodou. Zero em qualquer um vira pendencia la'
                      em cima — aqui e' so' o retrato. */}
                  <span className="coord-turma-dados">
                    <Dado
                      valor={turma.total_alunos}
                      rotulo={turma.total_alunos === 1 ? "aluno" : "alunos"}
                      alerta={turma.total_alunos === 0}
                    />
                    <Dado
                      valor={turma.aulas_na_grade}
                      rotulo={turma.aulas_na_grade === 1 ? "aula" : "aulas"}
                      alerta={turma.aulas_na_grade === 0}
                    />
                    {/* Frequencia SEM cor e SEM seta, de proposito — ver o
                        aviso no JSDoc do componente. "—" quando nunca houve
                        chamada: 0% afirmaria que a turma inteira faltou. */}
                    <Dado
                      valor={formatarPct(turma.frequencia_media_pct) ?? "—"}
                      rotulo="presença"
                    />
                  </span>
                </button>

                {/* Acoes da turma — fora do botao de selecao (link ou botao
                    dentro de botao e' HTML invalido).
                    gap-3 (12px) e nao gap-0.5: os botoes medem 32px e a area de
                    toque vai a 44, entao precisam de 12px entre si para uma nao
                    cobrir a outra. */}
                <div className="flex flex-none items-center gap-3 pr-2">
                  <BotaoIcone
                    como="link"
                    href={`/coordenacao/turmas/${turma.id}`}
                    rotulo={`Editar turma ${turma.nome} e sua grade de aulas`}
                    tamanho={32}
                    cor="var(--text-muted)"
                  >
                    <IconLapis />
                  </BotaoIcone>
                  <BotaoIcone
                    rotulo={`Excluir turma ${turma.nome}`}
                    aoClicar={() => aoExcluirTurma(turma)}
                    tamanho={32}
                    cor="var(--danger)"
                  >
                    <IconLixeira />
                  </BotaoIcone>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/**
 * Um número da linha da turma.
 *
 * `alerta` marca o zero que impede a turma de funcionar (sem aluno, sem
 * grade) — é o mesmo fato que virou pendência no topo, sinalizado aqui de
 * leve pra quem está varrendo a lista. Só zero de CADASTRO recebe a marca;
 * frequência nunca, mesmo baixa.
 */
function Dado({
  valor,
  rotulo,
  alerta = false,
}: {
  valor: number | string;
  rotulo: string;
  alerta?: boolean;
}) {
  return (
    <span className="coord-dado" data-alerta={alerta ? "sim" : undefined}>
      <strong className="coord-dado-valor">{valor}</strong> {rotulo}
    </span>
  );
}
