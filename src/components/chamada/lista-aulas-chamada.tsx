"use client";

import Link from "next/link";

import { BlocoColapsavel } from "@/components/relatorio/bloco-colapsavel";
import { IconSeta, IconSetaDireita } from "@/components/ui/icons";
import {
  formatarDataExtensa,
  formatarDiaSemana,
  formatarIntervalo,
} from "@/lib/format";
import type { AulaCard } from "@/lib/types";

type ListaAulasChamadaProps = {
  /** Aulas ja ordenadas: em andamento primeiro, depois da mais nova pra mais antiga. */
  aulas: AulaCard[];
  /** Id da turma desta pagina, anexado aos links como ?turma= para que a tela
   *  de destino saiba de onde o professor veio. */
  turmaId: number;
};

/**
 * Escolha da aula para chamada.
 *
 * A aula mais relevante (em andamento, ou a mais recente) ganha um cartao
 * grande com botao direto — e' nela que o professor quase sempre clica. As
 * demais ficam guardadas num cartao recolhivel "Aulas anteriores", fora do
 * caminho mas a um clique de distancia.
 *
 * Horario e materia sao nulos quando a sessao nao tem aula associada (camera
 * ligada na mao, ou aula excluida depois): a linha de apoio encolhe pra so' o
 * que existe, sem placeholder no lugar do dado ausente.
 */
export function ListaAulasChamada({ aulas, turmaId }: ListaAulasChamadaProps) {
  if (aulas.length === 0) {
    return (
      <div className="border-border-default bg-surface bloco-cam mx-auto max-w-lg rounded-[12px] border text-center">
        <h2 className="text-text m-0 text-[16px] font-semibold">
          Nenhuma aula registrada
        </h2>
        <p className="lousa-vazia">
          Quando a Cupcam monitorar uma aula desta turma, ela aparece aqui para
          a chamada.
        </p>
      </div>
    );
  }

  const [destaque, ...anteriores] = aulas;
  // Horario e materia so' aparecem quando existem — ver o JSDoc do componente.
  const apoioDestaque = [
    formatarIntervalo(destaque.hora_inicio, destaque.hora_fim),
    destaque.materia,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="flex flex-col gap-4">
      {/* Cartao grande: a aula da vez. */}
      <div
        className="bloco-cam rounded-[12px]"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--primary)",
          boxShadow: "var(--shadow-card)",
          backdropFilter: "var(--blur-card)",
        }}
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p
              className="bloco-cam-rotulo m-0"
              style={{ color: "var(--text-brand)" }}
            >
              {destaque.em_andamento ? "Aula em andamento" : "Última aula"}
            </p>
            <p className="text-text mt-1.5 text-[17px] font-semibold">
              {formatarDiaSemana(destaque.dia_semana)},{" "}
              {formatarDataExtensa(destaque.data)}
            </p>
            {/* O selo "Ao vivo" fica nesta linha mesmo quando nao ha horario —
                por isso o <p> continua renderizando com a legenda vazia. */}
            {(apoioDestaque || destaque.em_andamento) && (
              <p className="text-text-muted mt-0.5 text-[12.5px]">
                {apoioDestaque}
                {destaque.em_andamento && (
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10.5px] font-semibold tracking-wide uppercase ${
                      apoioDestaque ? "ml-2" : ""
                    }`}
                    style={{ background: "var(--ok-bg)", color: "var(--ok-fg)" }}
                  >
                    Ao vivo
                  </span>
                )}
              </p>
            )}
          </div>

          {/* `centrado`, e nao o `self-center` do Tailwind: `.btn-acao` ja'
              declara `align-self`, as duas regras teriam a mesma
              especificidade e quem vencesse dependeria da ordem das folhas
              (medido em 16/08: `self-center` perdeu, o botao ficou 5px acima
              do texto). */}
          <Link
            href={`/chamada/${destaque.sessao_id}?turma=${turmaId}`}
            className="btn-acao vidro centrado no-underline"
          >
            Fazer chamada
            <IconSetaDireita size={13} />
          </Link>
        </div>
      </div>

      {/* Aulas anteriores: o mesmo bloco recolhivel do resto do app, em vez de
          um cabecalho proprio — o `BlocoColapsavel` ja' traz o botao de
          verdade, o aria-expanded e a seta que gira. Nasce FECHADO: quem entra
          aqui quase sempre quer a aula da vez, la' em cima. */}
      {anteriores.length > 0 && (
        <BlocoColapsavel
          titulo="Aulas anteriores"
          conta={anteriores.length}
          abertoInicial={false}
        >
          <ul className="-mx-[17px] -mb-[16px]">
              {anteriores.map((aula) => {
                const apoio = [
                  formatarIntervalo(aula.hora_inicio, aula.hora_fim),
                  aula.materia,
                ]
                  .filter(Boolean)
                  .join(" · ");

                const rotuloAula = `${formatarDiaSemana(aula.dia_semana)}, ${formatarDataExtensa(aula.data)}`;

                return (
                <li
                  key={aula.sessao_id}
                  className="flex items-center gap-2 pr-4"
                  style={{ borderTop: "1px solid var(--border)" }}
                >
                  {/* Dois links irmaos, nao aninhados: o item inteiro era um
                      unico Link, e por isso o relatorio da aula nao tinha como
                      caber aqui — link dentro de link e' HTML invalido. */}
                  <Link
                    href={`/chamada/${aula.sessao_id}?turma=${turmaId}`}
                    className="hover:bg-surface-2 flex min-w-0 flex-1 items-center gap-4 px-6 py-4 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-text text-sm font-semibold">{rotuloAula}</p>
                      {apoio && (
                        <p className="text-text-muted mt-0.5 text-[13px]">{apoio}</p>
                      )}
                    </div>
                    <span
                      className="flex-none -rotate-90"
                      style={{ color: "var(--text-muted)" }}
                      aria-hidden
                    >
                      <IconSeta />
                    </span>
                  </Link>

                  <Link
                    href={`/relatorios/sessao/${aula.sessao_id}?turma=${turmaId}`}
                    className="text-text-brand hover:bg-surface-2 flex-none rounded-lg px-3 py-2 text-xs font-semibold transition-colors"
                  >
                    Ver análise
                    <span className="sr-only"> da aula de {rotuloAula}</span>
                  </Link>
                </li>
                );
              })}
          </ul>
        </BlocoColapsavel>
      )}
    </div>
  );
}
