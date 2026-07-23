"use client";

import { useMemo, useState } from "react";

import { AvatarAluno } from "@/components/chamada/avatar-aluno";
import { IconBusca, IconLixeira, IconMais, IconPessoas } from "@/components/ui/icons";
import type { AlunoAdmin, TurmaAdmin } from "@/lib/types";

type PainelAlunosProps = {
  /** Turma selecionada no painel esquerdo. Nulo quando nao ha turma nenhuma. */
  turma: TurmaAdmin | null;
  /** Alunos ja filtrados pela turma selecionada (a vista faz esse recorte). */
  alunos: AlunoAdmin[];
  /** Todas as turmas — alimenta o seletor de turma de cada linha. */
  turmas: TurmaAdmin[];
  aoNovoAluno: () => void;
  /** Rejeita com Error(mensagem) — o painel mostra o alerta e o select volta. */
  aoMudarTurma: (ra: string, turmaId: number) => Promise<void>;
  aoExcluir: (aluno: AlunoAdmin) => void;
};

/**
 * Painel direito da tela Administracao: cabecalho da turma, busca e a lista
 * de alunos matriculados.
 *
 * Componente burro: a vista decide qual turma esta selecionada e passa so'
 * os alunos dela; aqui so' filtramos por nome/RA no cliente. A mudanca de
 * turma acontece direto na linha (sem confirmacao nativa): o select dispara
 * o POST, mostra um spinner enquanto espera, e volta pro valor anterior
 * sozinho se der erro (o valor vem de `aluno.turma_id`, que so' muda depois
 * que a vista recarrega a visao com sucesso).
 */
export function PainelAlunos({
  turma,
  alunos,
  turmas,
  aoNovoAluno,
  aoMudarTurma,
  aoExcluir,
}: PainelAlunosProps) {
  const [busca, setBusca] = useState("");
  const [raEmAndamento, setRaEmAndamento] = useState<string | null>(null);
  const [erroMudancaTurma, setErroMudancaTurma] = useState<string | null>(null);

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return alunos;
    return alunos.filter(
      (aluno) =>
        aluno.nome.toLowerCase().includes(termo) ||
        aluno.ra.toLowerCase().includes(termo),
    );
  }, [alunos, busca]);

  /**
   * Dispara a mudanca de turma da linha. Nao ha confirmacao nativa — o select
   * ja e' a confirmacao. Em caso de erro, o select "volta" sozinho: nunca
   * atualizamos otimisticamente, entao `aluno.turma_id` (controlado pela vista)
   * nunca mudou de verdade.
   */
  async function aoSelecionarTurma(ra: string, turmaId: number) {
    setErroMudancaTurma(null);
    setRaEmAndamento(ra);
    try {
      await aoMudarTurma(ra, turmaId);
    } catch (causa) {
      setErroMudancaTurma(
        causa instanceof Error ? causa.message : "Não foi possível mudar o aluno de turma.",
      );
    } finally {
      setRaEmAndamento(null);
    }
  }

  return (
    <div
      className="flex flex-col rounded-2xl"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        boxShadow: "var(--shadow-card)",
      }}
    >
      {/* Cabecalho: nome da turma, contagem, busca e acao de adicionar. */}
      <div
        className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <div>
          <h2 className="text-text text-base font-extrabold">
            {turma ? turma.nome : "Alunos"}
          </h2>
          <p className="text-text-muted text-xs">
            {turma
              ? `${alunos.length} ${alunos.length === 1 ? "aluno matriculado" : "alunos matriculados"}`
              : "Selecione uma turma para ver os alunos"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <label className="border-border-default bg-surface flex min-w-[180px] flex-1 items-center gap-2 rounded-xl border px-3.5 py-2 sm:flex-none">
            <span className="text-text-muted flex-none">
              <IconBusca size={14} />
            </span>
            <span className="sr-only">Buscar aluno por nome ou RA</span>
            <input
              value={busca}
              onChange={(evento) => setBusca(evento.target.value)}
              placeholder="Buscar por nome ou RA..."
              className="text-text w-full bg-transparent text-sm outline-none"
              disabled={!turma}
            />
          </label>

          <button
            type="button"
            onClick={aoNovoAluno}
            disabled={!turma}
            className="flex flex-none items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-extrabold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
            style={{ background: "var(--primary)" }}
          >
            <IconMais size={14} />
            Adicionar aluno
          </button>
        </div>
      </div>

      {/* Alerta inline: erro ao mudar aluno de turma (o select ja voltou sozinho). */}
      {erroMudancaTurma && (
        <p
          role="alert"
          className="mx-5 mt-4 rounded-xl px-4 py-3 text-sm font-semibold"
          style={{ background: "var(--danger-bg)", color: "var(--danger-fg)" }}
        >
          {erroMudancaTurma}
        </p>
      )}

      {/* Corpo: estados vazios ou a lista. */}
      {!turma ? (
        <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
          <span className="text-text-muted" aria-hidden>
            <IconPessoas size={28} />
          </span>
          <p className="text-text text-sm font-bold">Nenhuma turma cadastrada ainda.</p>
          <p className="text-text-muted text-xs">
            Crie uma turma para começar a cadastrar alunos.
          </p>
        </div>
      ) : filtrados.length === 0 ? (
        <p className="text-text-muted px-6 py-14 text-center text-sm">
          Nenhum aluno encontrado nesta turma.
        </p>
      ) : (
        <>
          {/* Tabela — computador. */}
          <table className="hidden w-full sm:table">
            <thead>
              <tr
                className="bg-surface-2 text-left text-[11px] font-extrabold tracking-wide uppercase"
                style={{ color: "var(--text-muted)" }}
              >
                <th className="px-6 py-3.5 font-extrabold">Aluno</th>
                <th className="px-3 py-3.5 font-extrabold">RA</th>
                <th className="px-3 py-3.5 font-extrabold">Turma</th>
                <th className="px-6 py-3.5 text-right font-extrabold">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((aluno) => (
                <tr key={aluno.ra} style={{ borderTop: "1px solid var(--border)" }}>
                  <td className="px-6 py-3.5">
                    <div className="flex items-center gap-3">
                      <AvatarAluno nome={aluno.nome} ra={aluno.ra} tamanho={36} />
                      <span className="text-text text-sm font-bold">{aluno.nome}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3.5">
                    <span className="text-text-body text-sm">{aluno.ra}</span>
                  </td>
                  <td className="px-3 py-3.5">
                    <SeletorTurma
                      turmas={turmas}
                      valor={aluno.turma_id}
                      carregando={raEmAndamento === aluno.ra}
                      aoMudar={(turmaId) => aoSelecionarTurma(aluno.ra, turmaId)}
                    />
                  </td>
                  <td className="px-6 py-3.5 text-right">
                    <BotaoExcluir aluno={aluno} aoExcluir={aoExcluir} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Cartoes — celular. */}
          <ul className="flex flex-col sm:hidden">
            {filtrados.map((aluno) => (
              <li
                key={aluno.ra}
                className="flex flex-col gap-3 px-5 py-4"
                style={{ borderTop: "1px solid var(--border)" }}
              >
                <div className="flex items-center gap-3">
                  <AvatarAluno nome={aluno.nome} ra={aluno.ra} tamanho={40} />
                  <div className="min-w-0 flex-1">
                    <p className="text-text truncate text-sm font-bold">{aluno.nome}</p>
                    <p className="text-text-muted text-xs">Matrícula {aluno.ra}</p>
                  </div>
                  <BotaoExcluir aluno={aluno} aoExcluir={aoExcluir} />
                </div>
                <SeletorTurma
                  turmas={turmas}
                  valor={aluno.turma_id}
                  carregando={raEmAndamento === aluno.ra}
                  aoMudar={(turmaId) => aoSelecionarTurma(aluno.ra, turmaId)}
                />
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

/**
 * Seletor de turma de uma linha — dispara a mudanca de turma direto ao
 * escolher (sem confirmacao nativa). Mostra um spinner pequeno ao lado
 * enquanto o POST esta em voo e desabilita o proprio select nesse meio tempo,
 * pra nao disparar duas mudancas em paralelo.
 */
function SeletorTurma({
  turmas,
  valor,
  carregando,
  aoMudar,
}: {
  turmas: TurmaAdmin[];
  valor: number;
  carregando: boolean;
  aoMudar: (turmaId: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <select
        value={valor}
        onChange={(evento) => aoMudar(Number(evento.target.value))}
        disabled={carregando}
        className="bg-surface-2 text-text w-full rounded-lg px-2.5 py-1.5 text-xs font-semibold outline-none disabled:cursor-not-allowed disabled:opacity-60"
        style={{ border: "1px solid var(--border)" }}
        aria-label="Mudar aluno de turma"
      >
        {turmas.map((turma) => (
          <option key={turma.id} value={turma.id}>
            {turma.nome}
          </option>
        ))}
      </select>
      {carregando && (
        <span
          aria-hidden
          className="h-3.5 w-3.5 flex-none animate-spin rounded-full border-2"
          style={{ borderColor: "var(--border)", borderTopColor: "var(--primary)" }}
        />
      )}
    </div>
  );
}

/** Botao de excluir — abre o modal de confirmacao (2 estagios) na vista. */
function BotaoExcluir({
  aluno,
  aoExcluir,
}: {
  aluno: AlunoAdmin;
  aoExcluir: (aluno: AlunoAdmin) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => aoExcluir(aluno)}
      aria-label={`Excluir ${aluno.nome}`}
      className="inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
      style={{ color: "var(--danger)" }}
    >
      <IconLixeira />
    </button>
  );
}
