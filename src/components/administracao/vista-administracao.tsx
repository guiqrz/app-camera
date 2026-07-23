"use client";

import { useCallback, useMemo, useState } from "react";

import { ModalNovaTurma } from "@/components/administracao/modal-nova-turma";
import { ModalNovoAluno } from "@/components/administracao/modal-novo-aluno";
import { PainelAlunos } from "@/components/administracao/painel-alunos";
import { PainelTurmas } from "@/components/administracao/painel-turmas";
import { IconPessoas, IconTendencia, IconTurma } from "@/components/ui/icons";
import { StatCard } from "@/components/ui/stat-card";
import type { NovaTurma, VisaoAdmin } from "@/lib/types";

type VistaAdministracaoProps = {
  /** Retrato inicial vindo do servidor no carregamento da pagina. */
  visaoInicial: VisaoAdmin;
};

/**
 * Vista interativa da tela "Administracao".
 *
 * "Nova turma" e' a primeira mutacao real (B3): abre o modal, submete pra
 * /api/admin/turmas e recarrega a visao no sucesso. Os demais callbacks
 * (novo aluno, mudar turma, excluir) ainda nao gravam nada — chegam nas
 * proximas tarefas da cadeia. Os filhos (PainelTurmas/PainelAlunos) sao
 * "burros": so' recebem dados e callbacks, decisao fica toda aqui.
 */
export function VistaAdministracao({ visaoInicial }: VistaAdministracaoProps) {
  const [visao, setVisao] = useState<VisaoAdmin>(visaoInicial);
  const [selecionadaId, setSelecionadaId] = useState<number | null>(
    visaoInicial.turmas[0]?.id ?? null,
  );
  const [modalNovaTurmaAberto, setModalNovaTurmaAberto] = useState(false);
  const [modalNovoAlunoAberto, setModalNovoAlunoAberto] = useState(false);

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

  /* --- Nova turma: primeira mutacao real da tela --- */
  const aoNovaTurma = useCallback(() => {
    setModalNovaTurmaAberto(true);
  }, []);

  const aoSalvarNovaTurma = useCallback(
    async (dados: NovaTurma) => {
      const resposta = await fetch("/api/admin/turmas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dados),
      });

      if (!resposta.ok) {
        // Shape de erro da rota (src/app/api/admin/turmas/route.ts):
        // {erro, detalhe?}. `detalhe` e' o corpo cru repassado do FastAPI —
        // vem como {detail: "mensagem"} (ValueError vira HTTPException com
        // detail=str(erro) em cupcam/web/api.py), nao como string direto.
        // Prioriza a mensagem de negocio (ex.: horario invalido) quando existe.
        const corpo = (await resposta.json().catch(() => null)) as
          | { erro?: string; detalhe?: { detail?: string } }
          | null;
        const mensagem = corpo?.detalhe?.detail ?? corpo?.erro ?? "Não foi possível criar a turma.";
        throw new Error(mensagem);
      }

      setModalNovaTurmaAberto(false);
      await recarregar();
    },
    [recarregar],
  );

  /* --- Novo aluno: mesma forma da Nova turma, com foto (multipart) --- */
  const aoNovoAluno = useCallback(() => {
    setModalNovoAlunoAberto(true);
  }, []);

  const aoSalvarNovoAluno = useCallback(
    async (form: FormData) => {
      const resposta = await fetch("/api/admin/alunos", {
        method: "POST",
        body: form,
      });

      if (!resposta.ok) {
        // Mesma cadeia de erro da rota de turma (src/app/api/admin/alunos/route.ts):
        // {erro, detalhe?}. `detalhe` e' {detail: string} do FastAPI — 422 cobre
        // sem rosto, 2+ rostos, foto ilegivel, tipo/tamanho invalido.
        const corpo = (await resposta.json().catch(() => null)) as
          | { erro?: string; detalhe?: { detail?: string } }
          | null;
        const mensagem =
          corpo?.detalhe?.detail ?? corpo?.erro ?? "Não foi possível cadastrar o aluno.";
        throw new Error(mensagem);
      }

      setModalNovoAlunoAberto(false);
      await recarregar();
    },
    [recarregar],
  );

  /* --- Callbacks de mutacao: sem acao real nesta task --- */
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

      <ModalNovaTurma
        aberto={modalNovaTurmaAberto}
        aoFechar={() => setModalNovaTurmaAberto(false)}
        aoSalvar={aoSalvarNovaTurma}
      />

      <ModalNovoAluno
        aberto={modalNovoAlunoAberto}
        turmas={visao.turmas}
        turmaInicialId={turmaSelecionada?.id ?? null}
        aoFechar={() => setModalNovoAlunoAberto(false)}
        aoSalvar={aoSalvarNovoAluno}
      />
    </div>
  );
}
