"use client";

import Link from "next/link";

import {
  IconCamera,
  IconCalendario,
  IconCheck,
  IconPessoas,
  IconRosto,
  IconSetaDireita,
  IconTurma,
} from "@/components/ui/icons";
import type { PendenciaCoordenacao } from "@/lib/types";

type PainelPendenciasProps = {
  pendencias: PendenciaCoordenacao[];
  /** Abre o modal de aluno já com a turma escolhida (pendência de turma sem aluno). */
  aoCadastrarAlunos: (turmaId: number) => void;
};

/** O texto e o ícone de cada tipo de pendência, mais a ação que a resolve. */
type Desenho = {
  icone: React.ReactNode;
  titulo: string;
  apoio: string;
  /** Rótulo do botão. Ausente = a pendência é informativa e não tem ação direta. */
  acao?: string;
};

/**
 * O que falta CONFIGURAR na escola.
 *
 * ⚠️ A regra que define este componente: cada item é um fato sobre o CADASTRO
 * ("falta cadastrar aluno nesta turma"), nunca um juízo sobre quem ensina
 * ("esta turma vai mal"). O CLAUDE.md proíbe usar dado pra vigiar ou ranquear
 * professores, e como cada turma tem um professor atrás, uma pendência de
 * desempenho seria exatamente isso.
 *
 * Por isso frequência baixa NÃO entra aqui, mesmo sendo o dado mais chamativo
 * da tela: o backend nem chega a mandar (ver `_montar_pendencias_coordenacao`).
 *
 * As pendências agregadas (matéria, reconhecimento, sessão aberta) trazem só a
 * contagem, sem dizer de quem — nomear alunos numa tela de gestão seria expor
 * indivíduo, e nomear turmas viraria uma lista de "turmas mal configuradas".
 */
export function PainelPendencias({
  pendencias,
  aoCadastrarAlunos,
}: PainelPendenciasProps) {
  // Tudo configurado é um ESTADO da tela, não a ausência dela: sumir com o
  // bloco deixaria o coordenador sem saber se está tudo certo ou se a seção
  // simplesmente não existe.
  if (pendencias.length === 0) {
    return (
      <section className="pendencias pendencias-ok" aria-live="polite">
        <span className="pendencias-ok-selo" aria-hidden>
          <IconCheck size={15} />
        </span>
        <div>
          <h2 className="pendencias-titulo">Cadastro em dia</h2>
          <p className="pendencias-vazio">
            Todas as turmas têm alunos e grade, e nenhuma aula ficou sem
            matéria.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="pendencias" aria-live="polite">
      <div className="pendencias-topo">
        <h2 className="pendencias-titulo">Precisa de configuração</h2>
        <span className="pendencias-conta">{pendencias.length}</span>
      </div>

      <ul className="pendencias-lista">
        {pendencias.map((pendencia) => (
          <ItemPendencia
            key={chaveDaPendencia(pendencia)}
            pendencia={pendencia}
            aoCadastrarAlunos={aoCadastrarAlunos}
          />
        ))}
      </ul>
    </section>
  );
}

/** Chave estável: o tipo sozinho repetiria entre turmas diferentes. */
function chaveDaPendencia(pendencia: PendenciaCoordenacao): string {
  return "turma_id" in pendencia
    ? `${pendencia.tipo}-${pendencia.turma_id}`
    : pendencia.tipo;
}

/**
 * O texto de cada pendência.
 *
 * Redação deliberada: descreve o que FALTA e a consequência prática, sem
 * adjetivar. "4 aulas já foram monitoradas sem ninguém pra reconhecer" é um
 * fato do sistema; "esta turma está abandonada" seria julgamento.
 */
function desenharPendencia(pendencia: PendenciaCoordenacao): Desenho {
  switch (pendencia.tipo) {
    case "turma_sem_aluno":
      return {
        icone: <IconPessoas size={16} />,
        titulo: `${pendencia.turma_nome} não tem alunos cadastrados`,
        apoio:
          pendencia.sessoes_monitoradas > 0
            ? `A câmera já monitorou ${pendencia.sessoes_monitoradas} ${
                pendencia.sessoes_monitoradas === 1 ? "aula" : "aulas"
              } desta turma sem ninguém para reconhecer.`
            : "A chamada automática não tem quem reconhecer nesta turma.",
        acao: "Cadastrar alunos",
      };

    case "turma_sem_grade":
      return {
        icone: <IconCalendario size={16} />,
        titulo: `${pendencia.turma_nome} não tem aulas na grade`,
        // Esta é a pendência com a consequência mais concreta: sem grade, o
        // cruzamento sala + horário não encontra a turma.
        apoio:
          "Sem horário cadastrado, a câmera não consegue identificar esta turma sozinha.",
        acao: "Montar grade",
      };

    case "aulas_sem_materia":
      return {
        icone: <IconTurma size={16} />,
        titulo: `${pendencia.total} ${
          pendencia.total === 1 ? "aula sem matéria" : "aulas sem matéria"
        } vinculada`,
        apoio:
          "Relatórios e gráficos agrupam por matéria — sem o vínculo, essas aulas ficam de fora.",
      };

    case "alunos_sem_reconhecimento":
      return {
        icone: <IconRosto size={16} />,
        titulo: `${pendencia.total} ${
          pendencia.total === 1 ? "aluno sem foto" : "alunos sem foto"
        } de reconhecimento`,
        apoio:
          "A chamada automática não identifica quem não tem foto cadastrada — a presença precisa ser marcada à mão.",
      };

    case "sessoes_em_aberto":
      return {
        icone: <IconCamera size={16} />,
        titulo: `${pendencia.total} ${
          pendencia.total === 1 ? "gravação aberta" : "gravações abertas"
        }`,
        apoio:
          "A câmera começou e não encerrou. Enquanto isso, a aula aparece como “ao vivo”.",
      };
  }
}

function ItemPendencia({
  pendencia,
  aoCadastrarAlunos,
}: {
  pendencia: PendenciaCoordenacao;
  aoCadastrarAlunos: (turmaId: number) => void;
}) {
  const { icone, titulo, apoio, acao } = desenharPendencia(pendencia);

  return (
    <li className="pendencia">
      <span className="pendencia-icone" aria-hidden>
        {icone}
      </span>

      <div className="pendencia-texto">
        <p className="pendencia-titulo">{titulo}</p>
        <p className="pendencia-apoio">{apoio}</p>
      </div>

      {/* A ação sai da própria pendência: quem lê "não tem alunos" resolve ali,
          sem procurar onde fica o cadastro. Grade é link (outra página), aluno
          é botão (abre o modal desta tela) — daí os dois caminhos. */}
      {acao && pendencia.tipo === "turma_sem_grade" && (
        <Link
          href={`/coordenacao/turmas/${pendencia.turma_id}`}
          className="btn-acao vidro centrado no-underline"
        >
          {acao}
          <IconSetaDireita size={13} />
        </Link>
      )}
      {acao && pendencia.tipo === "turma_sem_aluno" && (
        <button
          type="button"
          onClick={() => aoCadastrarAlunos(pendencia.turma_id)}
          className="btn-acao vidro centrado"
        >
          {acao}
          <IconSetaDireita size={13} />
        </button>
      )}
    </li>
  );
}
