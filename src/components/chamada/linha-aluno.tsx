"use client";

import { AvatarAluno } from "@/components/chamada/avatar-aluno";
import { IconCheckSimples, IconFechar, IconSetaDireita } from "@/components/ui/icons";
import { gradientePresenca } from "@/lib/cor-presenca";
import type { AlunoChamada } from "@/lib/types";

type LinhaAlunoProps = {
  aluno: AlunoChamada;
  aoMarcar: (ra: string, presente: boolean) => void;
  aoAbrirDetalhe: () => void;
  /** Trava os botoes enquanto a confirmacao em lote esta correndo. */
  ocupado?: boolean;
};

/**
 * Uma linha da lista de chamada.
 *
 * No computador e' uma grade de 4 colunas; abaixo de 780px vira cartao
 * empilhado. Os botoes Presente/Ausente sao um seletor de dois estados: o ativo
 * fica preenchido na cor do significado, o outro so' contornado.
 *
 * ⚠️ A coluna da direita e' FREQUENCIA — presenca historica do aluno, que o
 * projeto permite por pessoa. NUNCA engajamento/atencao, que e' medido so' por
 * turma e nunca vinculado a um RA.
 */
export function LinhaAluno({
  aluno,
  aoMarcar,
  aoAbrirDetalhe,
  ocupado = false,
}: LinhaAlunoProps) {
  const presente = aluno.presente === 1;
  const pct = aluno.frequencia_pct;

  // O professor contrariou a camera: confirmou um estado diferente do
  // detectado. A marca deixa visivel onde a Cupcam errou nesta aula.
  const corrigido =
    aluno.confirmado_professor === 1 &&
    aluno.presente !== aluno.detectado_automaticamente;

  // Tres origens possiveis, nesta ordem de prioridade: o professor corrigiu a
  // camera > o professor confirmou > a camera detectou sozinha. Sem selo = o
  // aluno esta ausente e ninguem mexeu nisso ainda.
  const selo = corrigido
    ? { tipo: "corrigido", texto: "Corrigido por você" }
    : aluno.confirmado_professor === 1
      ? { tipo: "confirmado", texto: "Confirmado por você" }
      : aluno.detectado_automaticamente === 1
        ? { tipo: "camera", texto: "Detectado pela câmera" }
        : null;

  return (
    <li className="chamada-linha">
      <div className="chamada-aluno">
        <AvatarAluno nome={aluno.nome} ra={aluno.ra} />
        <div className="min-w-0">
          <div className="chamada-nome">{aluno.nome}</div>
          <div className="chamada-ra">Matrícula {aluno.ra}</div>
          {selo && (
            <span
              className="chamada-selo"
              data-tipo={selo.tipo}
              title={
                corrigido
                  ? "Você confirmou um estado diferente do que a câmera detectou"
                  : undefined
              }
            >
              {selo.texto}
            </span>
          )}
        </div>
      </div>

      {/* So' o simbolo, sem a palavra (ele pediu em 16/08): numa lista longa o
          que o olho procura e' o padrao de certos e errados, e duas palavras
          por linha viravam ruido.

          O texto NAO some do app — ele migra pro `aria-label`, que carrega o
          nome do aluno junto (numa lista de 30, "Presente" sozinho nao diz a
          quem se refere), e pro `title`, que devolve a palavra no mouse. O
          estado tambem nao fica so' na cor: `aria-pressed` diz qual esta
          valendo, e o simbolo ✓/✕ distingue os dois sem depender de enxergar
          verde e vermelho (WCAG 1.4.1). */}
      <div className="chamada-status">
        <button
          type="button"
          data-status="presente"
          aria-pressed={presente}
          aria-label={`Marcar ${aluno.nome} como presente`}
          title="Presente"
          disabled={ocupado}
          onClick={() => aoMarcar(aluno.ra, true)}
          className="chamada-status-botao"
        >
          <IconCheckSimples size={16} />
        </button>
        <button
          type="button"
          data-status="ausente"
          aria-pressed={!presente}
          aria-label={`Marcar ${aluno.nome} como ausente`}
          title="Ausente"
          disabled={ocupado}
          onClick={() => aoMarcar(aluno.ra, false)}
          className="chamada-status-botao"
        >
          <IconFechar size={16} />
        </button>
      </div>

      {/* Frequencia: barrinha + numero. `null` e' "sem historico", que e' outra
          afirmacao que "0%" — o aluno pode ser novo na turma. */}
      <div className="chamada-freq">
        {pct === null ? (
          <span className="chamada-freq-vazio">Sem histórico</span>
        ) : (
          <>
            <span className="chamada-freq-trilho" aria-hidden>
              <span
                className="chamada-freq-barra"
                style={{
                  width: `${Math.min(100, Math.max(0, pct))}%`,
                  background: gradientePresenca(pct),
                }}
              />
            </span>
            <span className="chamada-freq-valor">{Math.round(pct)}%</span>
          </>
        )}
      </div>

      <button type="button" onClick={aoAbrirDetalhe} className="btn-acao">
        Detalhes
        <IconSetaDireita size={13} />
      </button>
    </li>
  );
}
