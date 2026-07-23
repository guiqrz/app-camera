"use client";

import { AvatarAluno } from "@/components/chamada/avatar-aluno";
import { IconCheckSimples, IconFechar } from "@/components/ui/icons";
import { formatarPct } from "@/lib/format";
import type { AlunoChamada } from "@/lib/types";

type LinhaAlunoProps = {
  aluno: AlunoChamada;
  aoMarcar: (ra: string, presente: boolean) => void;
  aoAbrirDetalhe: () => void;
};

/** Cor do pontinho de frequencia, nas mesmas faixas do desenho. */
function corFrequencia(pct: number | null): string {
  if (pct === null) return "var(--text-muted)";
  if (pct >= 80) return "var(--ok)";
  if (pct >= 60) return "var(--warn)";
  return "var(--danger)";
}

/**
 * Uma linha da lista de chamada.
 *
 * No computador e' uma grade de colunas; no celular vira um cartao empilhado
 * com os botoes maiores (dedo, nao mouse). Os botoes Presente/Ausente sao um
 * seletor de dois estados: o ativo fica preenchido, o outro so' contornado.
 */
export function LinhaAluno({ aluno, aoMarcar, aoAbrirDetalhe }: LinhaAlunoProps) {
  const presente = aluno.presente === 1;

  return (
    <li
      className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-3 px-5 py-4 sm:grid-cols-[1fr_150px_130px_110px] sm:px-6"
      style={{ borderTop: "1px solid var(--border)" }}
    >
      {/* Aluno */}
      <div className="flex min-w-0 items-center gap-3">
        <AvatarAluno nome={aluno.nome} ra={aluno.ra} />
        <div className="min-w-0">
          <p className="text-text truncate text-sm font-bold">{aluno.nome}</p>
          <p className="text-text-muted text-xs">
            Matrícula {aluno.ra}
            {aluno.detectado_automaticamente === 1 && (
              <span
                className="ml-2 font-semibold"
                style={{ color: "var(--text-brand)" }}
              >
                · Detectado pela Cupcam
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Botoes Presente/Ausente */}
      <div className="flex gap-1.5 justify-self-end sm:justify-self-start">
        <BotaoStatus
          ativo={presente}
          tipo="presente"
          rotulo={`Marcar ${aluno.nome} como presente`}
          aoClicar={() => aoMarcar(aluno.ra, true)}
        />
        <BotaoStatus
          ativo={!presente}
          tipo="ausente"
          rotulo={`Marcar ${aluno.nome} como ausente`}
          aoClicar={() => aoMarcar(aluno.ra, false)}
        />
      </div>

      {/* Frequencia historica (presenca, nunca engajamento) */}
      <div className="flex items-center gap-2">
        <span
          className="h-2 w-2 flex-none rounded-full"
          style={{ background: corFrequencia(aluno.frequencia_pct) }}
          aria-hidden
        />
        <span className="text-text text-sm font-bold">
          {formatarPct(aluno.frequencia_pct) ?? "Sem histórico"}
        </span>
        <span className="text-text-muted text-xs sm:hidden">de frequência</span>
      </div>

      <button
        type="button"
        onClick={aoAbrirDetalhe}
        className="bg-surface-2 justify-self-end rounded-lg px-3.5 py-2 text-xs font-bold whitespace-nowrap"
        style={{ color: "var(--text-brand)" }}
      >
        Ver detalhes
      </button>
    </li>
  );
}

function BotaoStatus({
  ativo,
  tipo,
  rotulo,
  aoClicar,
}: {
  ativo: boolean;
  tipo: "presente" | "ausente";
  rotulo: string;
  aoClicar: () => void;
}) {
  const cor = tipo === "presente" ? "var(--ok)" : "var(--danger)";

  return (
    <button
      type="button"
      onClick={aoClicar}
      aria-label={rotulo}
      aria-pressed={ativo}
      className="flex h-9 w-9 items-center justify-center rounded-lg transition-colors sm:h-8 sm:w-8"
      style={{
        background: ativo ? cor : "transparent",
        border: ativo ? "none" : `1.5px solid ${cor}`,
        color: ativo ? "#fff" : cor,
      }}
    >
      {tipo === "presente" ? <IconCheckSimples /> : <IconFechar size={14} />}
    </button>
  );
}
