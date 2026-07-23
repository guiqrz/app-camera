"use client";

import { useCallback, useMemo, useState } from "react";

import { ModalConfirmarExclusao } from "@/components/administracao/modal-confirmar-exclusao";
import { ModalNovaTurma } from "@/components/administracao/modal-nova-turma";
import { ModalNovoAluno } from "@/components/administracao/modal-novo-aluno";
import { PainelAlunos } from "@/components/administracao/painel-alunos";
import { PainelTurmas } from "@/components/administracao/painel-turmas";
import { IconPessoas, IconTendencia, IconTurma } from "@/components/ui/icons";
import { StatCard } from "@/components/ui/stat-card";
import type { AlunoAdmin, NovaTurma, VisaoAdmin } from "@/lib/types";

type VistaAdministracaoProps = {
  /** Retrato inicial vindo do servidor no carregamento da pagina. */
  visaoInicial: VisaoAdmin;
};

/**
 * Vista interativa da tela "Administracao".
 *
 * "Nova turma" (B3) e "Novo aluno" (B4) abrem modal, submetem e recarregam a
 * visao no sucesso. B5 fecha o CRUD: mudar turma e' direto (sem modal, so'
 * o select da linha) e excluir usa o ModalConfirmarExclusao (2 estagios,
 * por causa do 409 de historico). Os filhos (PainelTurmas/PainelAlunos) sao
 * "burros": so' recebem dados e callbacks, decisao fica toda aqui.
 */
export function VistaAdministracao({ visaoInicial }: VistaAdministracaoProps) {
  const [visao, setVisao] = useState<VisaoAdmin>(visaoInicial);
  const [selecionadaId, setSelecionadaId] = useState<number | null>(
    visaoInicial.turmas[0]?.id ?? null,
  );
  const [modalNovaTurmaAberto, setModalNovaTurmaAberto] = useState(false);
  const [modalNovoAlunoAberto, setModalNovoAlunoAberto] = useState(false);
  const [alunoParaExcluir, setAlunoParaExcluir] = useState<AlunoAdmin | null>(null);
  // Aviso quando a mutacao (POST/DELETE) deu certo mas a recarga da visao
  // (GET) falhou depois — sem isso o modal fecha "com sucesso" e a lista fica
  // desatualizada; ex.: usuario acha que a turma nao foi criada e recria,
  // gerando duplicata (a API nao tem DELETE de turma pra desfazer isso).
  const [avisoRecarga, setAvisoRecarga] = useState<string | null>(null);

  /** Busca o retrato mais recente da API e substitui o estado local. */
  const recarregar = useCallback(async () => {
    try {
      const resposta = await fetch("/api/admin/visao", { cache: "no-store" });
      if (!resposta.ok) {
        setAvisoRecarga(
          "Salvo, mas não foi possível atualizar a lista — recarregue a página.",
        );
        return;
      }
      const dados = (await resposta.json()) as VisaoAdmin;
      setVisao(dados);
      // Mantem a selecao se a turma ainda existir; senao cai na primeira.
      setSelecionadaId((atual) => {
        if (atual !== null && dados.turmas.some((turma) => turma.id === atual)) {
          return atual;
        }
        return dados.turmas[0]?.id ?? null;
      });
      setAvisoRecarga(null);
    } catch (causa) {
      console.error("[cupcam] falha ao recarregar visao admin:", causa);
      setAvisoRecarga(
        "Salvo, mas não foi possível atualizar a lista — recarregue a página.",
      );
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

  /* --- Mudar turma: select da linha dispara direto, sem confirmacao --- */
  const aoMudarTurma = useCallback(
    async (ra: string, turmaId: number) => {
      const resposta = await fetch(`/api/admin/alunos/${encodeURIComponent(ra)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ turma_id: turmaId }),
      });

      if (!resposta.ok) {
        // Rota so' devolve {erro} pra POST (src/app/api/admin/alunos/[ra]/route.ts
        // nao anexa `detalhe` nesse caminho, so' no DELETE 409).
        const corpo = (await resposta.json().catch(() => null)) as { erro?: string } | null;
        throw new Error(corpo?.erro ?? "Não foi possível mudar o aluno de turma.");
      }

      await recarregar();
    },
    [recarregar],
  );

  /* --- Excluir aluno: abre o modal de 2 estagios --- */
  const aoExcluir = useCallback((aluno: AlunoAdmin) => {
    setAlunoParaExcluir(aluno);
  }, []);

  const aoConfirmarExclusao = useCallback(
    async (confirmarHistorico: boolean) => {
      if (!alunoParaExcluir) return;

      const resposta = await fetch(
        `/api/admin/alunos/${encodeURIComponent(alunoParaExcluir.ra)}?confirmar_historico=${confirmarHistorico}`,
        { method: "DELETE" },
      );

      if (!resposta.ok) {
        // Shape da rota (src/app/api/admin/alunos/[ra]/route.ts): {erro, detalhe?}.
        // No 409 (historico de presenca), `detalhe` e' o corpo cru repassado do
        // FastAPI: {detail: {nome, total_registros}} (confirmado em cupcam/web/api.py
        // — a excecao HistoricoExistente vira HTTPException(detail={...})).
        // O modal usa esse formato pra decidir se entra no estagio 2.
        const corpo = (await resposta.json().catch(() => null)) as
          | { erro?: string; detalhe?: { detail?: { nome?: string; total_registros?: number } } }
          | null;

        if (resposta.status === 409 && corpo?.detalhe?.detail) {
          const erro409 = new Error(corpo.erro ?? "Aluno tem histórico de presença.") as Error & {
            historico?: { nome: string; total_registros: number };
          };
          const { nome, total_registros } = corpo.detalhe.detail;
          if (typeof nome === "string" && typeof total_registros === "number") {
            erro409.historico = { nome, total_registros };
          }
          throw erro409;
        }

        throw new Error(corpo?.erro ?? "Não foi possível excluir o aluno.");
      }

      setAlunoParaExcluir(null);
      await recarregar();
    },
    [alunoParaExcluir, recarregar],
  );

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

      {/* Aviso: a mutacao deu certo, mas a recarga da lista falhou depois. */}
      {avisoRecarga && (
        <p
          role="alert"
          className="rounded-xl px-4 py-3 text-sm font-semibold"
          style={{ background: "var(--warn-bg)", color: "var(--warn-fg)" }}
        >
          {avisoRecarga}
        </p>
      )}

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

      <ModalConfirmarExclusao
        aluno={alunoParaExcluir}
        aberto={alunoParaExcluir !== null}
        aoFechar={() => setAlunoParaExcluir(null)}
        aoConfirmar={aoConfirmarExclusao}
      />
    </div>
  );
}
