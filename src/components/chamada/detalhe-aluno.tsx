"use client";

import { AvatarAluno } from "@/components/chamada/avatar-aluno";
import {
  IconCamera,
  IconCheck,
  IconSeta,
  IconTendencia,
} from "@/components/ui/icons";
import { StatCard } from "@/components/ui/stat-card";
import { formatarPct } from "@/lib/format";
import type { AlunoChamada } from "@/lib/types";

type DetalheAlunoProps = {
  aluno: AlunoChamada;
  nomeTurma: string;
  aoMarcar: (ra: string, presente: boolean) => void;
  aoVoltar: () => void;
  avisoErro: string | null;
};

/**
 * Detalhe de um aluno dentro da chamada.
 *
 * Mostra apenas dado individual permitido: presenca e frequencia. O desenho
 * original trazia engajamento por aluno — metrica que o CUPCAM so' calcula de
 * forma coletiva e anonima, entao esses paineis nao existem aqui.
 */
export function DetalheAluno({
  aluno,
  nomeTurma,
  aoMarcar,
  aoVoltar,
  avisoErro,
}: DetalheAlunoProps) {
  const presente = aluno.presente === 1;
  const detectado = aluno.detectado_automaticamente === 1;
  const confirmado = aluno.confirmado_professor === 1;

  return (
    <div className="flex flex-col gap-6">
      <button
        type="button"
        onClick={aoVoltar}
        className="flex items-center gap-2 self-start text-sm font-bold"
        style={{ color: "var(--text-brand)" }}
      >
        <span className="rotate-90" aria-hidden>
          <IconSeta size={16} />
        </span>
        Voltar para a chamada
      </button>

      {avisoErro && (
        <p
          role="alert"
          className="rounded-xl px-4 py-3 text-sm font-semibold"
          style={{ background: "var(--danger-bg)", color: "var(--danger-fg)" }}
        >
          {avisoErro}
        </p>
      )}

      {/* Cabecalho do aluno */}
      <div className="flex flex-wrap items-center gap-4">
        <AvatarAluno nome={aluno.nome} ra={aluno.ra} tamanho={64} />
        <div className="min-w-[200px] flex-1">
          <h1
            className="text-text text-2xl font-extrabold"
            style={{ fontFamily: "var(--font-geologica)" }}
          >
            {aluno.nome}
          </h1>
          <p className="text-text-muted mt-0.5 text-sm">
            {nomeTurma} · Matrícula {aluno.ra}
          </p>
        </div>

        <div className="flex gap-2">
          <BotaoStatusGrande
            rotulo="Presente"
            ativo={presente}
            cor="var(--ok)"
            aoClicar={() => aoMarcar(aluno.ra, true)}
          />
          <BotaoStatusGrande
            rotulo="Ausente"
            ativo={!presente}
            cor="var(--danger)"
            aoClicar={() => aoMarcar(aluno.ra, false)}
          />
        </div>
      </div>

      {/* Numeros individuais permitidos: presenca e frequencia. */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          rotulo="Frequência no período"
          valor={formatarPct(aluno.frequencia_pct) ?? "Sem histórico"}
          apoio="Presença nas aulas monitoradas"
          icone={
            <span style={{ color: "var(--primary)" }}>
              <IconTendencia />
            </span>
          }
        />
        <StatCard
          rotulo="Nesta aula"
          valor={presente ? "Presente" : "Ausente"}
          apoio={
            confirmado
              ? aluno.presente !== aluno.detectado_automaticamente
                ? "Confirmado pelo professor, corrigindo a câmera"
                : "Confirmado pelo professor"
              : "Ainda sem confirmação manual"
          }
          icone={
            <span style={{ color: presente ? "var(--ok)" : "var(--danger)" }}>
              <IconCheck />
            </span>
          }
        />
        <StatCard
          variante="brand"
          rotulo="Detecção Cupcam"
          valor={detectado ? "Detectado" : "Não detectado"}
          apoio={
            detectado
              ? "A câmera reconheceu o aluno em sala"
              : "A câmera não registrou o aluno nesta aula"
          }
          icone={
            <span style={{ color: "var(--text-on-brand)" }}>
              <IconCamera />
            </span>
          }
        />
        <StatCard
          rotulo="Privacidade"
          valor="Coletivo"
          apoio="O engajamento é medido por turma, nunca por aluno"
        />
      </div>
    </div>
  );
}

function BotaoStatusGrande({
  rotulo,
  ativo,
  cor,
  aoClicar,
}: {
  rotulo: string;
  ativo: boolean;
  cor: string;
  aoClicar: () => void;
}) {
  return (
    <button
      type="button"
      onClick={aoClicar}
      aria-pressed={ativo}
      className="rounded-xl px-4 py-2.5 text-[13px] font-bold transition-colors"
      style={{
        background: ativo ? cor : "transparent",
        border: ativo ? "none" : `1.5px solid ${cor}`,
        color: ativo ? "#fff" : cor,
      }}
    >
      {rotulo}
    </button>
  );
}
