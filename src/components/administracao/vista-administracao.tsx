"use client";

import { useCallback, useMemo, useState } from "react";

import { ModalAluno } from "@/components/administracao/modal-aluno";
import { ModalConfirmarExclusao } from "@/components/administracao/modal-confirmar-exclusao";
import {
  ModalConfirmarExclusaoTurma,
  type BloqueioTurma,
} from "@/components/administracao/modal-confirmar-exclusao-turma";
import { ModalTurma } from "@/components/administracao/modal-turma";
import { PainelAlunos } from "@/components/administracao/painel-alunos";
import { PainelTurmas } from "@/components/administracao/painel-turmas";
import { IconPessoas, IconTendencia, IconTurma } from "@/components/ui/icons";
import { StatCard } from "@/components/ui/stat-card";
import type { AlunoAdmin, NovaTurma, TurmaAdmin, VisaoAdmin } from "@/lib/types";

type VistaAdministracaoProps = {
  /** Retrato inicial vindo do servidor no carregamento da pagina. */
  visaoInicial: VisaoAdmin;
};

/** Estado dos modais de aluno e turma — modo mais o item sendo editado. */
type EstadoModalAluno = { modo: "criar" | "editar"; aluno?: AlunoAdmin };
type EstadoModalTurma = { modo: "criar" | "editar"; turma?: TurmaAdmin };

/**
 * Vista interativa da tela "Administracao".
 *
 * CRUD completo de turmas e alunos. Turma e aluno usam o mesmo modal pra criar
 * e editar (o `modo` decide POST vs. PUT). Exclusao usa modais de confirmacao
 * com 409 tratado: aluno com historico de presenca entra num 2o estagio;
 * turma com alunos entra num estado bloqueado. Os filhos
 * (PainelTurmas/PainelAlunos) sao "burros": so' recebem dados e callbacks, a
 * decisao fica toda aqui.
 */
export function VistaAdministracao({ visaoInicial }: VistaAdministracaoProps) {
  const [visao, setVisao] = useState<VisaoAdmin>(visaoInicial);
  const [selecionadaId, setSelecionadaId] = useState<number | null>(
    visaoInicial.turmas[0]?.id ?? null,
  );
  const [modalAluno, setModalAluno] = useState<EstadoModalAluno | null>(null);
  const [modalTurma, setModalTurma] = useState<EstadoModalTurma | null>(null);
  const [alunoParaExcluir, setAlunoParaExcluir] = useState<AlunoAdmin | null>(null);
  const [turmaParaExcluir, setTurmaParaExcluir] = useState<TurmaAdmin | null>(null);
  // Aviso quando a mutacao (POST/PUT/DELETE) deu certo mas a recarga da visao
  // (GET) falhou depois — sem isso o modal fecha "com sucesso" e a lista fica
  // desatualizada, e o usuario pode achar que a acao nao valeu e repeti-la.
  const [avisoRecarga, setAvisoRecarga] = useState<string | null>(null);

  // Cache-buster da miniatura. A URL da foto e' constante por RA e a ponte responde
  // com Cache-Control: max-age=30, entao trocar a foto de um aluno mostraria a antiga
  // por ate' 30s. Cada recarga bem-sucedida incrementa isto, mudando a URL do <img>.
  const [versaoFotos, setVersaoFotos] = useState(0);

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
      setVersaoFotos((atual) => atual + 1);
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

  /* --- Turma: criar/editar pelo mesmo modal --- */
  const aoNovaTurma = useCallback(() => setModalTurma({ modo: "criar" }), []);
  const aoEditarTurma = useCallback(
    (turma: TurmaAdmin) => setModalTurma({ modo: "editar", turma }),
    [],
  );

  const aoSalvarTurma = useCallback(
    async (dados: NovaTurma) => {
      if (!modalTurma) return;
      const editando = modalTurma.modo === "editar";
      const url = editando
        ? `/api/admin/turmas/${modalTurma.turma!.id}`
        : "/api/admin/turmas";

      const resposta = await fetch(url, {
        method: editando ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dados),
      });

      if (!resposta.ok) {
        // Shape de erro das rotas de turma: {erro, detalhe?}. `detalhe` e' o
        // corpo cru do FastAPI. No 409 de conflito vem {detail: {nome}}; no 422
        // de validacao vem {detail: "mensagem"}. Prioriza a mensagem util.
        const corpo = (await resposta.json().catch(() => null)) as
          | { erro?: string; detalhe?: { detail?: string | { nome?: string } } }
          | null;
        const detail = corpo?.detalhe?.detail;
        if (resposta.status === 409 && typeof detail === "object" && detail?.nome) {
          throw new Error(`Conflito de horário com a turma "${detail.nome}".`);
        }
        const mensagem =
          (typeof detail === "string" ? detail : undefined) ??
          corpo?.erro ??
          `Não foi possível ${editando ? "salvar" : "criar"} a turma.`;
        throw new Error(mensagem);
      }

      setModalTurma(null);
      await recarregar();
    },
    [modalTurma, recarregar],
  );

  /* --- Aluno: criar/editar pelo mesmo modal (multipart) --- */
  const aoNovoAluno = useCallback(() => setModalAluno({ modo: "criar" }), []);
  const aoEditar = useCallback(
    (aluno: AlunoAdmin) => setModalAluno({ modo: "editar", aluno }),
    [],
  );

  const aoSalvarAluno = useCallback(
    async (form: FormData) => {
      if (!modalAluno) return;
      const editando = modalAluno.modo === "editar";
      const url = editando
        ? `/api/admin/alunos/${encodeURIComponent(modalAluno.aluno!.ra)}`
        : "/api/admin/alunos";

      const resposta = await fetch(url, {
        method: editando ? "PUT" : "POST",
        body: form,
      });

      if (!resposta.ok) {
        // {erro, detalhe?}: `detalhe` e' {detail: string} do FastAPI — 422 cobre
        // sem rosto, 2+ rostos, foto ilegivel, tipo/tamanho invalido.
        const corpo = (await resposta.json().catch(() => null)) as
          | { erro?: string; detalhe?: { detail?: string } }
          | null;
        const mensagem =
          corpo?.detalhe?.detail ??
          corpo?.erro ??
          `Não foi possível ${editando ? "salvar" : "cadastrar"} o aluno.`;
        throw new Error(mensagem);
      }

      setModalAluno(null);
      await recarregar();
    },
    [modalAluno, recarregar],
  );

  /* --- Excluir aluno: modal de 2 estagios (409 = historico) --- */
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
        // No 409 (historico de presenca), `detalhe` e' {detail: {nome,
        // total_registros}}. O modal usa esse formato pra decidir o estagio 2.
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

  /* --- Excluir turma: modal com estado bloqueado (409 = turma com alunos) --- */
  const aoExcluirTurma = useCallback((turma: TurmaAdmin) => {
    setTurmaParaExcluir(turma);
  }, []);

  const aoConfirmarExclusaoTurma = useCallback(async () => {
    if (!turmaParaExcluir) return;

    const resposta = await fetch(`/api/admin/turmas/${turmaParaExcluir.id}`, {
      method: "DELETE",
    });

    if (!resposta.ok) {
      // O 409 tem DOIS motivos: "alunos" ({nome, total_alunos}) e "historico"
      // ({nome, total_sessoes}, turma que ja teve aula). O modal usa o motivo pra
      // escolher a mensagem — historico nao tem como ser resolvido pelo usuario.
      const corpo = (await resposta.json().catch(() => null)) as
        | {
            erro?: string;
            detalhe?: {
              detail?: {
                motivo?: string;
                nome?: string;
                total_alunos?: number;
                total_sessoes?: number;
              };
            };
          }
        | null;

      if (resposta.status === 409 && corpo?.detalhe?.detail) {
        const erro409 = new Error(corpo.erro ?? "Não foi possível excluir a turma.") as Error & {
          turmaBloqueada?: BloqueioTurma;
        };
        const { motivo, nome, total_alunos, total_sessoes } = corpo.detalhe.detail;
        if (typeof nome === "string") {
          if (motivo === "historico" && typeof total_sessoes === "number") {
            erro409.turmaBloqueada = { motivo: "historico", nome, total: total_sessoes };
          } else if (typeof total_alunos === "number") {
            erro409.turmaBloqueada = { motivo: "alunos", nome, total: total_alunos };
          }
        }
        throw erro409;
      }

      throw new Error(corpo?.erro ?? "Não foi possível excluir a turma.");
    }

    setTurmaParaExcluir(null);
    await recarregar();
  }, [turmaParaExcluir, recarregar]);

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
          aoEditarTurma={aoEditarTurma}
          aoExcluirTurma={aoExcluirTurma}
        />
        <PainelAlunos
          turma={turmaSelecionada}
          alunos={alunosDaTurma}
          versaoFotos={versaoFotos}
          aoNovoAluno={aoNovoAluno}
          aoEditar={aoEditar}
          aoExcluir={aoExcluir}
        />
      </div>

      <ModalTurma
        aberto={modalTurma !== null}
        modo={modalTurma?.modo ?? "criar"}
        turma={modalTurma?.turma ?? null}
        aoFechar={() => setModalTurma(null)}
        aoSalvar={aoSalvarTurma}
      />

      <ModalAluno
        aberto={modalAluno !== null}
        modo={modalAluno?.modo ?? "criar"}
        turmas={visao.turmas}
        turmaInicialId={turmaSelecionada?.id ?? null}
        aluno={modalAluno?.aluno ?? null}
        aoFechar={() => setModalAluno(null)}
        aoSalvar={aoSalvarAluno}
      />

      <ModalConfirmarExclusao
        aluno={alunoParaExcluir}
        aberto={alunoParaExcluir !== null}
        aoFechar={() => setAlunoParaExcluir(null)}
        aoConfirmar={aoConfirmarExclusao}
      />

      <ModalConfirmarExclusaoTurma
        turma={turmaParaExcluir}
        aberto={turmaParaExcluir !== null}
        aoFechar={() => setTurmaParaExcluir(null)}
        aoConfirmar={aoConfirmarExclusaoTurma}
      />
    </div>
  );
}
