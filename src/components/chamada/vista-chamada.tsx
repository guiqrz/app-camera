"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { DetalheAluno } from "@/components/chamada/detalhe-aluno";
import { LinhaAluno } from "@/components/chamada/linha-aluno";
import {
  IconBusca,
  IconCamera,
  IconPessoaAusente,
  IconPessoaPresente,
  IconTendencia,
} from "@/components/ui/icons";
import { StatCard } from "@/components/ui/stat-card";
import { dataDoTimestamp, formatarDataExtensa, formatarPct } from "@/lib/format";
import type { AlunoChamada, ChamadaDaSessao } from "@/lib/types";

type Filtro = "todos" | "presentes" | "ausentes";

type VistaChamadaProps = {
  /** Retrato da chamada vindo do servidor no carregamento da pagina. */
  inicial: ChamadaDaSessao;
  sessaoId: number;
};

/**
 * Vista interativa da tela "Fazer Chamada".
 *
 * A lista de alunos vive em estado local e e' a fonte da verdade da tela:
 * cada clique atualiza a interface NA HORA (UI otimista) e grava em segundo
 * plano via /api/chamada. Se a gravacao falhar, o clique e' desfeito e um
 * aviso explica o que houve — o professor nunca fica olhando um spinner
 * entre um aluno e outro.
 */
export function VistaChamada({ inicial, sessaoId }: VistaChamadaProps) {
  const [alunos, setAlunos] = useState<AlunoChamada[]>(inicial.alunos);
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [raAberto, setRaAberto] = useState<string | null>(null);
  const [avisoErro, setAvisoErro] = useState<string | null>(null);
  const [emAndamento, setEmAndamento] = useState(
    inicial.sessao.encerrada_em === null,
  );

  // RAs com gravacao em voo: o poll ao vivo nao pode sobrescrever um clique
  // otimista que ainda nao chegou ao banco.
  const gravandoRef = useRef<Set<string>>(new Set());

  // O aviso de erro some sozinho; o timer e' limpo se outro erro chegar antes.
  const timerAviso = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mostrarErro = useCallback((mensagem: string) => {
    setAvisoErro(mensagem);
    if (timerAviso.current) clearTimeout(timerAviso.current);
    timerAviso.current = setTimeout(() => setAvisoErro(null), 6000);
  }, []);
  useEffect(() => {
    return () => {
      if (timerAviso.current) clearTimeout(timerAviso.current);
    };
  }, []);

  /**
   * Marca presenca/falta com UI otimista.
   *
   * 1. Atualiza o estado local imediatamente (presente + confirmado).
   * 2. Grava via nossa rota /api/chamada.
   * 3. Se falhar, restaura o aluno exatamente como estava antes do clique.
   */
  const marcar = useCallback(
    async (ra: string, presente: boolean) => {
      let anterior: AlunoChamada | undefined;

      gravandoRef.current.add(ra);
      setAlunos((atuais) =>
        atuais.map((aluno) => {
          if (aluno.ra !== ra) return aluno;
          anterior = aluno;
          return {
            ...aluno,
            presente: presente ? 1 : 0,
            confirmado_professor: 1,
          };
        }),
      );

      try {
        const resposta = await fetch(
          `/api/chamada/${sessaoId}/${encodeURIComponent(ra)}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ presente }),
          },
        );
        if (!resposta.ok) throw new Error(`status ${resposta.status}`);
        return true;
      } catch (causa) {
        console.error("[cupcam] falha ao gravar presenca:", causa);
        // Desfaz o clique: devolve o aluno ao estado anterior.
        setAlunos((atuais) =>
          atuais.map((aluno) =>
            aluno.ra === ra && anterior ? anterior : aluno,
          ),
        );
        mostrarErro(
          "Não foi possível salvar a presença. Verifique a conexão e tente de novo.",
        );
        return false;
      } finally {
        gravandoRef.current.delete(ra);
      }
    },
    [sessaoId, mostrarErro],
  );

  /**
   * Chamada ao vivo: enquanto a aula esta em andamento, busca o retrato novo
   * a cada 15s — a camera vai detectando alunos e a lista acompanha sozinha.
   *
   * O dado do servidor vence, EXCETO para alunos com clique otimista em voo
   * (gravandoRef), que mantem o estado local ate a gravacao terminar.
   */
  useEffect(() => {
    if (!emAndamento) return;

    const intervalo = setInterval(async () => {
      try {
        const resposta = await fetch(`/api/chamada/${sessaoId}`);
        if (!resposta.ok) return; // falha de rede: tenta de novo no proximo tique
        const dados = (await resposta.json()) as ChamadaDaSessao;

        setAlunos((locais) =>
          dados.alunos.map((doServidor) => {
            if (!gravandoRef.current.has(doServidor.ra)) return doServidor;
            return (
              locais.find((aluno) => aluno.ra === doServidor.ra) ?? doServidor
            );
          }),
        );

        // A aula encerrou no meio do caminho: para o poll.
        if (dados.sessao.encerrada_em !== null) setEmAndamento(false);
      } catch (causa) {
        // Sem aviso na tela: e' atualizacao de fundo, o professor nao pediu.
        console.error("[cupcam] falha na atualizacao ao vivo:", causa);
      }
    }, 15_000);

    return () => clearInterval(intervalo);
  }, [emAndamento, sessaoId]);

  /** Marca presentes todos os que estao como ausentes, um POST por aluno. */
  const marcarTodosPresentes = useCallback(() => {
    const ausentes = alunos.filter((aluno) => aluno.presente === 0);
    // Disparos em paralelo: cada um ja e' otimista e se desfaz sozinho.
    ausentes.forEach((aluno) => void marcar(aluno.ra, true));
  }, [alunos, marcar]);

  /* --- Numeros derivados do estado local (reagem a cada clique) --- */

  const total = alunos.length;
  const presentes = alunos.filter((aluno) => aluno.presente === 1).length;
  const ausentes = total - presentes;
  const detectados = alunos.filter(
    (aluno) => aluno.detectado_automaticamente === 1,
  ).length;
  const presencaPct = total > 0 ? Math.round((100 * presentes) / total) : null;
  const mediaHistoricaPct = inicial.comparativo.media_historica_pct;

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return alunos.filter((aluno) => {
      if (termo && !aluno.nome.toLowerCase().includes(termo)) return false;
      if (filtro === "presentes" && aluno.presente !== 1) return false;
      if (filtro === "ausentes" && aluno.presente !== 0) return false;
      return true;
    });
  }, [alunos, busca, filtro]);

  const alunoAberto = raAberto
    ? (alunos.find((aluno) => aluno.ra === raAberto) ?? null)
    : null;

  /* --- View Detalhe do aluno --- */

  if (alunoAberto) {
    return (
      <DetalheAluno
        aluno={alunoAberto}
        nomeTurma={inicial.sessao.turma}
        aoMarcar={marcar}
        aoVoltar={() => setRaAberto(null)}
        avisoErro={avisoErro}
      />
    );
  }

  /* --- View Lista --- */

  const dataAula = formatarDataExtensa(dataDoTimestamp(inicial.sessao.iniciada_em));

  const FILTROS: { chave: Filtro; rotulo: string }[] = [
    { chave: "todos", rotulo: "Todos" },
    { chave: "presentes", rotulo: "Presentes" },
    { chave: "ausentes", rotulo: "Ausentes" },
  ];

  return (
    <div className="flex flex-col gap-7">
      <div>
        <h1
          className="text-text text-2xl font-extrabold sm:text-3xl"
          style={{ fontFamily: "var(--font-geologica)" }}
        >
          Fazer Chamada
        </h1>
        <p className="text-text-body mt-1.5 flex flex-wrap items-center gap-2 text-sm">
          {inicial.sessao.turma} · {dataAula}. Cada marcação é salva na hora.
          {emAndamento && (
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-extrabold tracking-wide uppercase"
              style={{ background: "var(--ok-bg)", color: "var(--ok-fg)" }}
            >
              <span
                className="h-1.5 w-1.5 animate-pulse rounded-full"
                style={{ background: "var(--ok)" }}
                aria-hidden
              />
              Ao vivo
            </span>
          )}
        </p>
      </div>

      {avisoErro && <AvisoErro mensagem={avisoErro} />}

      {/* Cards de resumo — reagem a cada clique na lista. */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          rotulo="Presença geral"
          valor={formatarPct(presencaPct) ?? "Sem alunos"}
          apoio={`de ${total} alunos matriculados`}
          icone={
            <span style={{ color: "var(--ok)" }}>
              <IconPessoaPresente />
            </span>
          }
        />
        <StatCard
          rotulo="Presentes"
          valor={
            <>
              {presentes}
              <span className="text-text-muted text-lg font-bold">/{total}</span>
            </>
          }
          apoio="Confirmados nesta aula"
          icone={
            <span style={{ color: "var(--ok)" }}>
              <IconPessoaPresente />
            </span>
          }
        />
        <StatCard
          rotulo="Ausentes"
          valor={ausentes}
          apoio="Sem presença registrada"
          icone={
            <span style={{ color: "var(--danger)" }}>
              <IconPessoaAusente />
            </span>
          }
        />
        <StatCard
          variante="brand"
          rotulo="Detecção Cupcam"
          valor={
            <>
              {detectados}
              <span className="text-lg font-bold opacity-85">/{total}</span>
            </>
          }
          apoio="Alunos detectados automaticamente"
          icone={
            <span style={{ color: "var(--text-on-brand)" }}>
              <IconCamera />
            </span>
          }
        />
      </div>

      {/* Comparativo com a media historica da turma. */}
      <div
        className="rounded-2xl p-6"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          boxShadow: "var(--shadow-card)",
        }}
      >
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-text flex items-center gap-2 text-base font-extrabold">
            <span style={{ color: "var(--primary)" }}>
              <IconTendencia size={16} />
            </span>
            Comparativo da turma
          </h2>
          <EtiquetaComparativo hoje={presencaPct} media={mediaHistoricaPct} />
        </div>

        <BarraComparativo
          rotulo="Hoje"
          pct={presencaPct}
          cor="var(--primary)"
        />
        <div className="h-3.5" />
        <BarraComparativo
          rotulo="Média das últimas aulas"
          pct={mediaHistoricaPct}
          cor="var(--cyan-500)"
        />
      </div>

      {/* Busca, filtros e acao em massa. */}
      <div className="flex flex-wrap items-center gap-3">
        <label
          className="border-border-default bg-surface flex min-w-[200px] flex-1 items-center gap-2.5 rounded-xl border px-4 py-2.5"
        >
          <span className="text-text-muted flex-none">
            <IconBusca size={16} />
          </span>
          <span className="sr-only">Buscar aluno por nome</span>
          <input
            value={busca}
            onChange={(evento) => setBusca(evento.target.value)}
            placeholder="Buscar aluno por nome..."
            className="text-text w-full bg-transparent text-sm outline-none"
          />
        </label>

        <div className="flex gap-2" role="group" aria-label="Filtrar alunos">
          {FILTROS.map(({ chave, rotulo }) => {
            const ativo = filtro === chave;
            return (
              <button
                key={chave}
                type="button"
                onClick={() => setFiltro(chave)}
                aria-pressed={ativo}
                className="rounded-xl px-4 py-2.5 text-[13px] font-bold whitespace-nowrap transition-colors"
                style={{
                  background: ativo ? "var(--primary)" : "var(--surface)",
                  color: ativo ? "#fff" : "var(--text-body)",
                  border: ativo ? "1px solid transparent" : "1px solid var(--border)",
                }}
              >
                {rotulo}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={marcarTodosPresentes}
          disabled={ausentes === 0}
          className="rounded-xl border-2 px-4 py-2 text-sm font-bold whitespace-nowrap transition-opacity disabled:cursor-not-allowed disabled:opacity-40 sm:ml-auto"
          style={{ borderColor: "var(--primary)", color: "var(--primary)" }}
        >
          Marcar todos presentes
        </button>
      </div>

      {/* Lista de alunos. */}
      <div
        className="overflow-hidden rounded-2xl"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          boxShadow: "var(--shadow-card)",
        }}
      >
        <div
          className="bg-surface-2 hidden grid-cols-[1fr_150px_130px_110px] gap-3 px-6 py-3.5 text-[11px] font-extrabold tracking-wide uppercase sm:grid"
          style={{ color: "var(--text-muted)" }}
          aria-hidden
        >
          <span>Aluno</span>
          <span>Status</span>
          <span>Frequência</span>
          <span />
        </div>

        {filtrados.length === 0 ? (
          <p className="text-text-muted px-6 py-10 text-center text-sm">
            Nenhum aluno encontrado.
          </p>
        ) : (
          <ul>
            {filtrados.map((aluno) => (
              <LinhaAluno
                key={aluno.ra}
                aluno={aluno}
                aoMarcar={marcar}
                aoAbrirDetalhe={() => setRaAberto(aluno.ra)}
              />
            ))}
          </ul>
        )}
      </div>

      <Link
        href={`/relatorios/sessao/${sessaoId}`}
        className="self-end rounded-xl px-7 py-3.5 text-[15px] font-extrabold text-white"
        style={{ background: "var(--primary)", boxShadow: "var(--shadow-raise)" }}
      >
        Concluir e ver relatório
      </Link>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Pecas internas da vista                                             */
/* ------------------------------------------------------------------ */

function AvisoErro({ mensagem }: { mensagem: string }) {
  return (
    <p
      role="alert"
      className="rounded-xl px-4 py-3 text-sm font-semibold"
      style={{ background: "var(--danger-bg)", color: "var(--danger-fg)" }}
    >
      {mensagem}
    </p>
  );
}

function BarraComparativo({
  rotulo,
  pct,
  cor,
}: {
  rotulo: string;
  pct: number | null;
  cor: string;
}) {
  return (
    <div>
      <div
        className="mb-1.5 flex justify-between text-[13px]"
        style={{ color: "var(--text-muted)" }}
      >
        <span>{rotulo}</span>
        <span className="font-bold">{formatarPct(pct) ?? "Sem dados"}</span>
      </div>
      <div className="bg-surface-2 h-2 overflow-hidden rounded-full">
        <div
          className="h-full rounded-full transition-[width] duration-300"
          style={{ width: `${pct ?? 0}%`, background: cor }}
        />
      </div>
    </div>
  );
}

/** Etiqueta "+4% vs média" — so' aparece quando ha historico pra comparar. */
function EtiquetaComparativo({
  hoje,
  media,
}: {
  hoje: number | null;
  media: number | null;
}) {
  if (hoje === null || media === null) return null;

  const diferenca = Math.round(hoje - media);
  return (
    <span
      className="rounded-full px-2.5 py-1 text-xs font-extrabold whitespace-nowrap"
      style={{ background: "var(--violet-100)", color: "var(--text-brand)" }}
    >
      {diferenca >= 0 ? "+" : ""}
      {diferenca}% vs média
    </span>
  );
}
