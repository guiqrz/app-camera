"use client";

import { useMemo, useState } from "react";

import { FormularioAula } from "@/components/coordenacao/formulario-aula";
import { BotaoIcone } from "@/components/ui/botao-icone";
import { EtiquetaMateria } from "@/components/ui/etiqueta-materia";
import { IconCheck, IconFechar, IconLixeira, IconMais } from "@/components/ui/icons";
import type { Aula, Materia, NovaAula } from "@/lib/types";
import { dentroDoTurno, type Turno } from "@/lib/turnos";

/**
 * Dias mostrados sempre, mesmo vazios: a semana letiva. Sabado e domingo so'
 * ganham coluna se a turma tiver aula neles (o backend aceita 0-6), pra nao
 * gastar 2/7 da largura com dias que quase nunca tem aula.
 */
const DIAS_UTEIS = [1, 2, 3, 4, 5] as const;

const NOMES_DOS_DIAS: Record<number, { curto: string; longo: string }> = {
  0: { curto: "Dom", longo: "Domingo" },
  1: { curto: "Seg", longo: "Segunda-feira" },
  2: { curto: "Ter", longo: "Terça-feira" },
  3: { curto: "Qua", longo: "Quarta-feira" },
  4: { curto: "Qui", longo: "Quinta-feira" },
  5: { curto: "Sex", longo: "Sexta-feira" },
  6: { curto: "Sáb", longo: "Sábado" },
};

/** Qual formulario esta aberto: uma aula nova num dia, ou uma aula existente. */
type FormularioAberto =
  | { tipo: "criar"; dia: number }
  | { tipo: "editar"; dia: number; aula: Aula };

type GradeSemanalProps = {
  aulas: Aula[];
  materias: Materia[];
  turno: Turno;
  carregando?: boolean;
  erro?: string | null;
  /** Cria a aula no dia da coluna. Rejeita com Error(mensagem). */
  aoCriarAula: (dados: NovaAula) => Promise<void>;
  /** Salva a aula existente. Rejeita com Error(mensagem). */
  aoSalvarAula: (aula: Aula, dados: NovaAula) => Promise<void>;
  aoExcluirAula: (aula: Aula) => void;
};

/**
 * Grade semanal da turma — uma coluna por dia, as aulas empilhadas por
 * horario dentro de cada uma.
 *
 * Substitui a lista vertical do antigo `PainelAulas`: em colunas o coordenador
 * ve a semana inteira de uma vez e enxerga os buracos, que e' o que ele
 * precisa pra montar a grade.
 *
 * Todo cadastro acontece INLINE, na propria coluna: o `+` do rodape abre o
 * formulario ali, com o dia ja' decidido pela coluna. Nao ha modal — o dia
 * clicado e o dia salvo sao o mesmo por construcao.
 *
 * Estado local e' so' de UI: qual formulario esta aberto e qual aula esta com
 * exclusao pendente de confirmacao. Dado nenhum e' buscado ou gravado aqui.
 */
export function GradeSemanal({
  aulas,
  materias,
  turno,
  carregando = false,
  erro = null,
  aoCriarAula,
  aoSalvarAula,
  aoExcluirAula,
}: GradeSemanalProps) {
  const [formulario, setFormulario] = useState<FormularioAberto | null>(null);
  const [aulaParaExcluirId, setAulaParaExcluirId] = useState<number | null>(null);
  // Escape do filtro de turno. Ligado, a grade mostra a semana inteira.
  const [mostrarTodas, setMostrarTodas] = useState(false);

  // A grade mostra so' as aulas do turno selecionado. Esconder dado e' sempre
  // arriscado — uma aula invisivel pode levar o coordenador a cadastrar outra
  // por cima e tomar um 409 "de uma aula que nao esta na tela" — entao o que
  // some e' SEMPRE contado no aviso acima da grade, com escape pra ver tudo.
  const aulasVisiveis = useMemo(
    () =>
      mostrarTodas ? aulas : aulas.filter((aula) => dentroDoTurno(aula.hora_inicio, turno)),
    [aulas, turno, mostrarTodas],
  );

  const totalOcultas = aulas.length - aulasVisiveis.length;

  // Fim de semana entra na grade so' quando ja' tem aula: o coordenador que
  // precisa de sabado consegue ver e editar o que existe, e quem nao usa nao
  // perde largura de tela com duas colunas vazias.
  //
  // Olha `aulas` (todas), nao `aulasVisiveis`: a coluna de sabado precisa
  // continuar na tela quando a unica aula dela esta oculta pelo filtro, senao
  // o botao de adicionar naquele dia sumiria junto.
  const diasVisiveis = useMemo(() => {
    const comAula = new Set(aulas.map((aula) => aula.dia_semana));
    const dias = [...DIAS_UTEIS] as number[];
    if (comAula.has(6)) dias.push(6);
    if (comAula.has(0)) dias.unshift(0);
    return dias;
  }, [aulas]);

  const porDia = useMemo(() => {
    const grupos = new Map<number, Aula[]>();
    for (const aula of aulasVisiveis) {
      const doDia = grupos.get(aula.dia_semana);
      if (doDia) doDia.push(aula);
      else grupos.set(aula.dia_semana, [aula]);
    }
    // "HH:MM" ordena certo como string (5 caracteres, zero a esquerda).
    for (const doDia of grupos.values()) {
      doDia.sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio));
    }
    return grupos;
  }, [aulasVisiveis]);

  return (
    <div
      className="flex flex-col rounded-2xl"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        boxShadow: "var(--shadow-card)",
      }}
    >
      <div
        className="flex flex-col gap-1 px-5 py-4"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <h2 className="text-text text-base font-semibold">Grade semanal</h2>
        <p className="text-text-muted text-xs">
          Clique no <strong>+</strong> do dia para adicionar uma aula.
        </p>
      </div>

      {/* Falha na busca aparece acima da grade: a grade anterior pode ainda
          estar na tela, e o usuario precisa saber que ela esta velha. */}
      {erro && (
        <p
          role="alert"
          className="mx-5 mt-4 rounded-xl px-4 py-3 text-sm font-semibold"
          style={{ background: "var(--danger-bg)", color: "var(--danger-fg)" }}
        >
          {erro}
        </p>
      )}

      {/* Nada pode sumir em silencio: se o filtro de turno escondeu alguma
          aula, o coordenador ve quantas sao e consegue trazer todas de volta
          num clique. Sem isso, uma aula esquecida no outro turno so' apareceria
          como um 409 de conflito com algo invisivel. */}
      {totalOcultas > 0 && (
        <div className="mx-5 mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl px-4 py-2.5">
          <p className="text-text-muted text-xs">
            <strong className="text-text font-semibold">
              {totalOcultas} {totalOcultas === 1 ? "aula" : "aulas"}
            </strong>{" "}
            fora do turno da {turno.nome.toLowerCase()}{" "}
            {totalOcultas === 1 ? "está oculta" : "estão ocultas"}.
          </p>
          <button
            type="button"
            onClick={() => setMostrarTodas(true)}
            className="text-xs font-semibold"
            style={{ color: "var(--text-brand)" }}
          >
            Mostrar todas
          </button>
        </div>
      )}

      {mostrarTodas && (
        <div className="mx-5 mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl px-4 py-2.5">
          <p className="text-text-muted text-xs">Mostrando a semana inteira.</p>
          <button
            type="button"
            onClick={() => setMostrarTodas(false)}
            className="text-xs font-semibold"
            style={{ color: "var(--text-brand)" }}
          >
            Ver só o turno da {turno.nome.toLowerCase()}
          </button>
        </div>
      )}

      {carregando && aulas.length === 0 ? (
        <p className="text-text-muted px-6 py-12 text-center text-sm">Carregando aulas...</p>
      ) : (
        /* Rolagem horizontal no celular: 5 colunas nao cabem numa tela
           estreita, e espremer cada uma deixaria o horario ilegivel. */
        <div className="overflow-x-auto p-4" style={{ opacity: carregando ? 0.55 : 1 }}>
          <div
            className="grid min-w-max gap-3"
            style={{
              gridTemplateColumns: `repeat(${diasVisiveis.length}, minmax(160px, 1fr))`,
            }}
          >
            {diasVisiveis.map((dia) => {
              const aulasDoDia = porDia.get(dia) ?? [];
              const nomes = NOMES_DOS_DIAS[dia];
              const criandoAqui = formulario?.tipo === "criar" && formulario.dia === dia;

              return (
                <section
                  key={dia}
                  className="flex flex-col gap-2 rounded-xl p-2.5"
                  style={{ background: "var(--surface-2)" }}
                >
                  <h3 className="text-text-muted px-1 text-[11px] font-semibold tracking-wide uppercase">
                    <abbr title={nomes.longo} className="no-underline">
                      {nomes.curto}
                    </abbr>
                  </h3>

                  {aulasDoDia.map((aula) => {
                    const editandoEsta =
                      formulario?.tipo === "editar" && formulario.aula.id === aula.id;

                    if (editandoEsta) {
                      return (
                        <FormularioAula
                          // `key` com o id da aula remonta o formulario ao
                          // trocar de aula — sem isso o estado do anterior
                          // vazaria pro proximo.
                          key={`editar-${aula.id}`}
                          diaSemana={dia}
                          aula={aula}
                          materias={materias}
                          turno={turno}
                          aoCancelar={() => setFormulario(null)}
                          aoSalvar={async (dados) => {
                            await aoSalvarAula(aula, dados);
                            setFormulario(null);
                          }}
                        />
                      );
                    }

                    const armada = aulaParaExcluirId === aula.id;

                    return (
                      <div
                        key={aula.id}
                        className="flex flex-col gap-1.5 rounded-xl p-2.5"
                        style={{
                          background: "var(--surface)",
                          border: armada
                            ? "1.5px solid var(--danger)"
                            : "1.5px solid var(--border)",
                        }}
                      >
                        <div className="flex items-start justify-between gap-1.5">
                          <div className="min-w-0">
                            <p className="text-text text-xs font-semibold">
                              {aula.hora_inicio}–{aula.hora_fim}
                            </p>
                            <p className="mt-0.5 text-[11px]">
                              <EtiquetaMateria
                                nome={aula.materia_nome}
                                cor={aula.materia_cor}
                              />
                            </p>
                          </div>

                          {armada ? (
                            /* Confirmacao inline: o DELETE de aula nao tem 409
                               nem consequencia em cascata (a sessao so' perde o
                               vinculo), entao um segundo clique basta.

                               Alvo de toque em 36px (nao 44) e gap-2: a coluna do
                               dia tem 160px, e dois alvos de 44 lado a lado se
                               cobririam — um roubaria o clique do outro. */
                            <div className="flex flex-none items-center gap-2">
                              <BotaoIcone
                                rotulo={`Confirmar exclusão da aula de ${rotuloAula(dia, aula)}`}
                                aoClicar={() => {
                                  setAulaParaExcluirId(null);
                                  aoExcluirAula(aula);
                                }}
                                tamanho={28}
                                alvo={36}
                                fundo="var(--danger)"
                                className="text-white"
                              >
                                <IconCheck size={14} />
                              </BotaoIcone>
                              <BotaoIcone
                                rotulo="Cancelar exclusão"
                                aoClicar={() => setAulaParaExcluirId(null)}
                                tamanho={28}
                                alvo={36}
                                cor="var(--text-muted)"
                              >
                                <IconFechar size={14} />
                              </BotaoIcone>
                            </div>
                          ) : (
                            <BotaoIcone
                              rotulo={`Excluir aula de ${rotuloAula(dia, aula)}`}
                              aoClicar={() => setAulaParaExcluirId(aula.id)}
                              tamanho={28}
                              cor="var(--danger)"
                            >
                              <IconLixeira size={14} />
                            </BotaoIcone>
                          )}
                        </div>

                        {!armada && (
                          <button
                            type="button"
                            onClick={() => {
                              setAulaParaExcluirId(null);
                              setFormulario({ tipo: "editar", dia, aula });
                            }}
                            className="rounded-lg py-1 text-[11px] font-semibold"
                            style={{ color: "var(--text-brand)" }}
                          >
                            Editar
                          </button>
                        )}
                      </div>
                    );
                  })}

                  {criandoAqui ? (
                    <FormularioAula
                      // `key` no dia remonta o formulario ao trocar de coluna.
                      key={`criar-${dia}`}
                      diaSemana={dia}
                      materias={materias}
                      turno={turno}
                      aoCancelar={() => setFormulario(null)}
                      aoSalvar={async (dados) => {
                        await aoCriarAula(dados);
                        setFormulario(null);
                      }}
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setAulaParaExcluirId(null);
                        setFormulario({ tipo: "criar", dia });
                      }}
                      aria-label={`Adicionar aula na ${nomes.longo}`}
                      className="flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-[11px] font-semibold transition-colors"
                      style={{
                        color: "var(--text-brand)",
                        border: "1.5px dashed var(--border)",
                      }}
                    >
                      <IconMais size={13} />
                      Aula
                    </button>
                  )}
                </section>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/** Texto curto que identifica a aula nos `aria-label` dos botoes de acao. */
function rotuloAula(dia: number, aula: Aula): string {
  const nome = NOMES_DOS_DIAS[dia]?.longo ?? aula.dia_semana_nome;
  return `${nome} ${aula.hora_inicio} às ${aula.hora_fim}`;
}
