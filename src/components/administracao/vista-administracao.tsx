"use client";

import { useCallback, useMemo, useState } from "react";

import { PainelAlunos } from "@/components/administracao/painel-alunos";
import { PainelTurmas } from "@/components/administracao/painel-turmas";
import { IconPessoas, IconTendencia, IconTurma } from "@/components/ui/icons";
import { StatCard } from "@/components/ui/stat-card";
import type { VisaoAdmin } from "@/lib/types";

type VistaAdministracaoProps = {
  /** Retrato inicial vindo do servidor no carregamento da pagina. */
  visaoInicial: VisaoAdmin;
};

/**
 * Vista interativa da tela "Administracao".
 *
 * Modo LEITURA nesta task: mantem `visao` em estado local e sabe recarregar
 * do zero via /api/admin/visao, mas os callbacks de mutacao (nova turma,
 * novo aluno, mudar turma, excluir) ainda nao gravam nada — isso chega nas
 * proximas tarefas da cadeia. Os filhos (PainelTurmas/PainelAlunos) sao
 * "burros": so' recebem dados e callbacks, decisao fica toda aqui.
 */
export function VistaAdministracao({ visaoInicial }: VistaAdministracaoProps) {
  const [visao, setVisao] = useState<VisaoAdmin>(visaoInicial);
  const [selecionadaId, setSelecionadaId] = useState<number | null>(
    visaoInicial.turmas[0]?.id ?? null,
  );

  /** Busca o retrato mais recente da API e substitui o estado local. */
  const recarregar = useCallback(async () => {
    try {
      const resposta = await fetch("/api/admin/visao", { cache: "no-store" });
      if (!resposta.ok) return;
      const dados = (await resposta.json()) as VisaoAdmin;
      setVisao(dados);
      // Mantem a selecao se a turma ainda existir; senao cai na primeira.
      setSelecionadaId((atual) => {
        if (atual !== null && dados.turmas.some((turma) => turma.id === atual)) {
          return atual;
        }
        return dados.turmas[0]?.id ?? null;
      });
    } catch (causa) {
      console.error("[cupcam] falha ao recarregar visao admin:", causa);
    }
  }, []);

  const turmaSelecionada = useMemo(
    () => visao.turmas.find((turma) => turma.id === selecionadaId) ?? null,
    [visao.turmas, selecionadaId],
  );

  const alunosDaTurma = useMemo(
    () =>
      turmaSelecionada
        ? visao.alunos.filter((aluno) => aluno.turma_id === turmaSelecionada.id)
        : [],
    [visao.alunos, turmaSelecionada],
  );

  const mediaPorTurma =
    visao.totais.turmas > 0
      ? Math.round(visao.totais.alunos / visao.totais.turmas)
      : null;

  /* --- Callbacks de mutacao: sem acao real nesta task --- */
  const aoNovaTurma = useCallback(() => {
    void recarregar();
  }, [recarregar]);
  const aoNovoAluno = useCallback(() => {
    void recarregar();
  }, [recarregar]);
  const aoMudarTurma = useCallback((_ra: string, _turmaId: number) => {
    void recarregar();
  }, [recarregar]);
  const aoExcluir = useCallback((_ra: string) => {
    void recarregar();
  }, [recarregar]);

  return (
    <div className="flex flex-col gap-7">
      <div>
        <h1
          className="text-text text-2xl font-extrabold sm:text-3xl"
          style={{ fontFamily: "var(--font-geologica)" }}
        >
          Administração
        </h1>
        <p className="text-text-body mt-1.5 text-sm">
          Cadastre turmas, matricule alunos e gerencie a base do CUPCAM.
        </p>
      </div>

      {/* Cards de resumo. */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          rotulo="Turmas ativas"
          valor={visao.totais.turmas}
          apoio="Cadastradas no sistema"
          icone={
            <span style={{ color: "var(--primary)" }}>
              <IconTurma size={18} />
            </span>
          }
        />
        <StatCard
          rotulo="Alunos matriculados"
          valor={visao.totais.alunos}
          apoio="Em todas as turmas"
          icone={
            <span style={{ color: "var(--primary)" }}>
              <IconPessoas size={18} />
            </span>
          }
        />
        <StatCard
          variante="brand"
          rotulo="Média por turma"
          valor={mediaPorTurma ?? "—"}
          apoio="Alunos por turma"
          icone={
            <span style={{ color: "var(--text-on-brand)" }}>
              <IconTendencia size={18} />
            </span>
          }
        />
      </div>

      {/* Paineis: turmas a esquerda, alunos da turma selecionada a direita. */}
      <div className="grid gap-5 lg:grid-cols-[340px_1fr] lg:items-start">
        <PainelTurmas
          turmas={visao.turmas}
          selecionadaId={selecionadaId}
          aoSelecionar={setSelecionadaId}
          aoNovaTurma={aoNovaTurma}
        />
        <PainelAlunos
          turma={turmaSelecionada}
          alunos={alunosDaTurma}
          turmas={visao.turmas}
          aoNovoAluno={aoNovoAluno}
          aoMudarTurma={aoMudarTurma}
          aoExcluir={aoExcluir}
        />
      </div>
    </div>
  );
}
