"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { EtiquetaMateria } from "@/components/ui/etiqueta-materia";
import type { AulaDaAgendaCoordenacao, ProfessorDaLista, TurmaAdmin } from "@/lib/types";

/** Semana letiva sempre; sabado e domingo so' quando tem aula (igual a' grade da turma). */
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

/** Valor do <option> "todos/todas" dos filtros. */
const TODOS = "";

type Props = {
  /** Turmas da escola, pro filtro por turma. */
  turmas: TurmaAdmin[];
};

/**
 * Agenda da coordenacao (papeis, 03/10/2026): a grade da escola inteira em
 * formato de semana, com filtro por professor e por turma.
 *
 * SO' horario, turma, materia e professor -- decisao do usuario: a coordenacao
 * nao entra nas telas do professor, entao plano, anexo e o que aconteceu na
 * aula ficam fora (o backend nem manda). O clique numa aula leva a' grade da
 * turma, onde se troca o horario ou o professor.
 *
 * A grade se repete toda semana (as aulas so' tem dia da semana), entao nao ha'
 * navegacao entre semanas: toda semana seria igual.
 */
export function AgendaCoordenacao({ turmas }: Props) {
  const [professores, setProfessores] = useState<ProfessorDaLista[]>([]);
  const [aulas, setAulas] = useState<AulaDaAgendaCoordenacao[]>([]);
  const [professorId, setProfessorId] = useState(TODOS);
  const [turmaId, setTurmaId] = useState(TODOS);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  // A lista de professores so' alimenta o filtro: falhar aqui deixa o filtro
  // so' com "Todos", sem travar a agenda.
  useEffect(() => {
    const id = setTimeout(() => {
      void (async () => {
        try {
          const resposta = await fetch("/api/coordenacao/professores", { cache: "no-store" });
          if (resposta.ok) setProfessores((await resposta.json()) as ProfessorDaLista[]);
        } catch (causa) {
          console.error("[cupcam] falha ao carregar professores:", causa);
        }
      })();
    }, 0);
    return () => clearTimeout(id);
  }, []);

  // Recarrega a cada troca de filtro. setTimeout(0): mesmo motivo do
  // painel-geral.tsx (o lint le setState sincrono no efeito como derivavel).
  useEffect(() => {
    let cancelado = false;
    const id = setTimeout(() => {
      void (async () => {
        setCarregando(true);
        const consulta = new URLSearchParams();
        if (professorId !== TODOS) consulta.set("professor_id", professorId);
        if (turmaId !== TODOS) consulta.set("turma_id", turmaId);
        try {
          const resposta = await fetch(`/api/coordenacao/agenda?${consulta}`, { cache: "no-store" });
          if (!resposta.ok) throw new Error(String(resposta.status));
          const dados = (await resposta.json()) as { aulas: AulaDaAgendaCoordenacao[] };
          if (!cancelado) {
            setAulas(dados.aulas);
            setErro(null);
          }
        } catch {
          // A agenda anterior pode continuar na tela: o aviso diz que ela esta' velha.
          if (!cancelado) setErro("Não foi possível carregar a agenda. Tente novamente em instantes.");
        } finally {
          if (!cancelado) setCarregando(false);
        }
      })();
    }, 0);
    return () => {
      cancelado = true;
      clearTimeout(id);
    };
  }, [professorId, turmaId]);

  const diasVisiveis = useMemo(() => {
    const comAula = new Set(aulas.map((aula) => aula.dia_semana));
    const dias = [...DIAS_UTEIS] as number[];
    if (comAula.has(6)) dias.push(6);
    if (comAula.has(0)) dias.unshift(0);
    return dias;
  }, [aulas]);

  const porDia = useMemo(() => {
    const grupos = new Map<number, AulaDaAgendaCoordenacao[]>();
    for (const aula of aulas) {
      const doDia = grupos.get(aula.dia_semana);
      if (doDia) doDia.push(aula);
      else grupos.set(aula.dia_semana, [aula]);
    }
    return grupos;
  }, [aulas]);

  const semProfessor = aulas.filter((aula) => aula.professor_id === null).length;

  return (
    <section className="coord-painel">
      <div className="coord-painel-topo grade-topo">
        <div>
          <h2 className="coord-painel-titulo">Agenda da escola</h2>
          <p className="grade-apoio">
            Todas as aulas da semana. Clique numa aula para ajustar na grade da turma.
          </p>
        </div>
        <span className="grade-conta">
          {aulas.length} {aulas.length === 1 ? "aula" : "aulas"}
        </span>
      </div>

      <div className="flex flex-wrap gap-3 px-5 pt-4">
        <label className="flex min-w-[180px] flex-col gap-1.5">
          <span className="text-text-muted text-xs font-semibold">Professor</span>
          <select
            className="cfg-select"
            value={professorId}
            onChange={(evento) => setProfessorId(evento.target.value)}
          >
            <option value={TODOS}>Todos os professores</option>
            {professores.map((professor) => (
              <option key={professor.id} value={professor.id}>
                {professor.nome}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-w-[180px] flex-col gap-1.5">
          <span className="text-text-muted text-xs font-semibold">Turma</span>
          <select
            className="cfg-select"
            value={turmaId}
            onChange={(evento) => setTurmaId(evento.target.value)}
          >
            <option value={TODOS}>Todas as turmas</option>
            {turmas.map((turma) => (
              <option key={turma.id} value={turma.id}>
                {turma.nome}
              </option>
            ))}
          </select>
        </label>
      </div>

      {erro && (
        <p
          role="alert"
          className="mx-5 mt-4 rounded-xl px-4 py-3 text-sm font-semibold"
          style={{ background: "var(--danger-bg)", color: "var(--danger-fg)" }}
        >
          {erro}
        </p>
      )}

      {/* Aula sem professor nao aparece na tela de nenhum professor: o aviso
          existe pra ela nao ficar esquecida. So' faz sentido sem filtro de
          professor (filtrando por um, as sem dono ja' nao entram). */}
      {professorId === TODOS && semProfessor > 0 && (
        <div className="grade-faixa" data-tom="aviso">
          <p className="grade-faixa-texto">
            <strong>
              {semProfessor} {semProfessor === 1 ? "aula" : "aulas"}
            </strong>{" "}
            sem professor atribuído. {semProfessor === 1 ? "Ela só aparece" : "Elas só aparecem"}{" "}
            para a administração.
          </p>
        </div>
      )}

      {carregando && aulas.length === 0 ? (
        <p className="text-text-muted px-6 py-12 text-center text-sm">Carregando agenda...</p>
      ) : aulas.length === 0 ? (
        <p className="text-text-muted px-6 py-12 text-center text-sm">
          Nenhuma aula na grade com esses filtros.
        </p>
      ) : (
        <div className="overflow-x-auto p-4" style={{ opacity: carregando ? 0.55 : 1 }}>
          <div
            className="grid min-w-max gap-3"
            style={{ gridTemplateColumns: `repeat(${diasVisiveis.length}, minmax(160px, 1fr))` }}
          >
            {diasVisiveis.map((dia) => {
              const aulasDoDia = porDia.get(dia) ?? [];
              const nomes = NOMES_DOS_DIAS[dia];
              return (
                <section key={dia} className="grade-dia">
                  <h3 className="grade-dia-titulo">
                    <abbr title={nomes.longo} className="no-underline">
                      {nomes.curto}
                    </abbr>
                    {aulasDoDia.length > 0 && (
                      <span className="grade-dia-conta">{aulasDoDia.length}</span>
                    )}
                  </h3>
                  {aulasDoDia.map((aula) => (
                    <Link
                      key={aula.id}
                      href={`/coordenacao/turmas/${aula.turma_id}`}
                      className="grade-aula"
                      aria-label={`${nomes.longo}, ${aula.hora_inicio} a ${aula.hora_fim}, ${aula.turma}, ${
                        aula.professor ?? "sem professor"
                      }. Abrir a grade da turma.`}
                    >
                      <p className="grade-aula-hora">
                        {aula.hora_inicio}–{aula.hora_fim}
                      </p>
                      <p className="text-text mt-0.5 truncate text-[12px] font-semibold">
                        {aula.turma}
                      </p>
                      <p className="mt-0.5 text-[11px]">
                        <EtiquetaMateria nome={aula.materia} cor={aula.cor} />
                      </p>
                      <p className="text-text-muted mt-1 truncate text-[11px]">
                        {aula.professor ?? "Sem professor"}
                      </p>
                    </Link>
                  ))}
                </section>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
