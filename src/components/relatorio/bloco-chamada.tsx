import Link from "next/link";

import { IconSetaDireita } from "@/components/ui/icons";
import type { AlunoChamada, ChamadaDaSessao } from "@/lib/types";

/** Quantos alunos aparecem na prévia antes de "Ver chamada completa". */
const QUANTOS_NA_PREVIA = 4;

/**
 * Faixa de cor da frequência histórica.
 *
 * Escala ABSOLUTA aqui (diferente do engajamento, que é relativo à média da
 * turma): 100% de presença é um teto real e alcançável — todo mundo veio.
 */
function faixaDaFrequencia(pct: number): "alta" | "media" | "baixa" {
  if (pct >= 70) return "alta";
  if (pct >= 25) return "media";
  return "baixa";
}

const COR_DA_FAIXA = {
  alta: "var(--ok-fg)",
  media: "var(--warn-fg)",
  // `--danger-fg` é o par de TEXTO do vermelho, com contraste medido; a cor
  // de gráfico reprovaria em AA neste tamanho.
  baixa: "var(--danger-fg)",
} as const;

/** "Morcego Frito" -> "MO". Iniciais no lugar de foto. */
function iniciais(nome: string) {
  const limpo = nome.trim();
  if (!limpo) return "?";
  return limpo.slice(0, 2).toUpperCase();
}

type Props = {
  chamada: ChamadaDaSessao;
  /** Turma de onde o professor veio — vai no link da chamada completa. */
  sessaoId: number;
};

/**
 * O miolo do bloco "Chamada automática" — o `.presenca-corpo` do protótipo.
 *
 * ⚠️ MOSTRA PRESENÇA, NUNCA ENGAJAMENTO POR ALUNO. O número ao lado de cada
 * nome é FREQUÊNCIA HISTÓRICA ("esteve em 14 das 17 aulas"), que é dado
 * individual permitido no projeto. Atenção por pessoa não existe no banco e
 * não pode passar a existir — ver a regra de privacidade no CLAUDE.md.
 *
 * As iniciais fazem as vezes de foto de propósito: `alunos.foto_thumb` existe,
 * mas rosto de aluno numa tela de relatório é exposição desnecessária.
 */
export function BlocoChamada({ chamada, sessaoId }: Props) {
  const { resumo, comparativo, alunos } = chamada;

  // Presentes primeiro: é a informação que o professor procura ao abrir o
  // bloco, e sem ordenar a prévia poderia mostrar 4 ausentes numa aula que
  // teve presença.
  const ordenados = [...alunos].sort(
    (a, b) => b.presente - a.presente || a.nome.localeCompare(b.nome),
  );
  const previa = ordenados.slice(0, QUANTOS_NA_PREVIA);

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-baseline gap-[9px]">
        <p
          className="text-text m-0 text-[34px] tabular-nums"
          style={{ fontWeight: 300, lineHeight: 1.05, letterSpacing: "-0.03em" }}
        >
          {resumo.presentes}
          <span className="text-text-muted text-[19px]">/{resumo.total}</span>
        </p>
        <p className="text-text-muted m-0 text-[12px]">alunos presentes</p>
      </div>

      <p className="text-text-muted mt-[9px] mb-0 text-[11.5px] leading-[1.5]">
        Detectados pela câmera durante a aula.
        {comparativo.media_historica_pct !== null && (
          <>
            {" "}
            A média desta turma é{" "}
            <strong className="text-text font-semibold">
              {Math.round(comparativo.media_historica_pct)}%
            </strong>
            .
          </>
        )}
      </p>

      <ul className="mt-[13px] mb-0 flex list-none flex-col gap-[3px] p-0">
        {previa.map((aluno) => (
          <LinhaDoAluno key={aluno.ra} aluno={aluno} />
        ))}
      </ul>

      {/* `mt-auto` empurra pro rodapé: o card tem altura fixa quando aberto
          (trava a fileira com o gráfico ao lado), então o botão precisa
          ancorar embaixo em vez de flutuar logo após a lista. */}
      <Link
        href={`/chamada/${sessaoId}`}
        className="border-border-default text-text hover:bg-surface-2 mt-auto flex w-full flex-none items-center justify-center gap-[6px] rounded-[9px] border px-3 py-[9px] pt-[9px] text-[12.5px] font-semibold no-underline transition-colors"
        style={{ background: "var(--surface-2)", marginTop: "11px" }}
      >
        Ver chamada completa
        <IconSetaDireita size={14} />
      </Link>
    </div>
  );
}

/** Avatar de iniciais + nome/estado + a barra de frequência histórica. */
function LinhaDoAluno({ aluno }: { aluno: AlunoChamada }) {
  const presente = aluno.presente === 1;
  const pct = aluno.frequencia_pct;
  const faixa = pct === null ? null : faixaDaFrequencia(pct);
  const cor = faixa ? COR_DA_FAIXA[faixa] : "var(--text-muted)";

  return (
    <li className="hover:bg-surface-2 flex items-center gap-[11px] rounded-[11px] px-2 py-[7px] transition-colors">
      <span
        className="text-text grid h-[38px] w-[38px] flex-none place-items-center rounded-full text-[12px] font-semibold"
        style={{
          background: "color-mix(in srgb, var(--primary) 15%, transparent)",
          letterSpacing: "0.02em",
        }}
        aria-hidden
      >
        {iniciais(aluno.nome)}
      </span>

      <span className="flex min-w-0 flex-1 flex-col gap-px">
        <span className="text-text truncate text-[13.5px]">{aluno.nome}</span>
        {/* Estado é TEXTO + bolinha, nunca só a cor: quem não distingue cor
            precisa ler "Presente"/"Ausente". */}
        <span
          className="inline-flex items-center gap-[5px] text-[11px]"
          style={{
            color: presente ? "var(--ok-fg)" : "var(--text-muted)",
            opacity: presente ? 1 : 0.75,
          }}
        >
          <span
            className="h-[6px] w-[6px] flex-none rounded-full"
            style={{ background: "currentColor" }}
            aria-hidden
          />
          {presente ? "Presente" : "Ausente"}
        </span>
      </span>

      {pct !== null && (
        <span
          className="flex flex-none items-center gap-2 tabular-nums"
          title={`Frequência histórica: ${Math.round(pct)}%`}
        >
          {/* Trilho de VIDRO: borda clara + blur, então ele revela o fundo em
              vez de ser um cinza chapado. */}
          <span
            className="relative block h-[9px] w-[62px] overflow-hidden rounded-full"
            style={{
              background: "color-mix(in srgb, var(--text-muted) 13%, transparent)",
              border: "1px solid color-mix(in srgb, var(--border) 80%, transparent)",
              backdropFilter: "blur(6px) saturate(1.3)",
            }}
          >
            <span
              className="block h-full rounded-full"
              style={{
                width: `${pct}%`,
                background: `linear-gradient(90deg, color-mix(in srgb, ${cor} 72%, transparent), ${cor})`,
              }}
            />
            {/* Brilho no topo — a "luz" que faz parecer vidro. */}
            <span
              className="pointer-events-none absolute inset-x-0 top-0 bottom-[55%] rounded-t-full"
              style={{
                background:
                  "linear-gradient(180deg, rgba(255,255,255,.28), transparent)",
              }}
              aria-hidden
            />
          </span>
          <span
            className="min-w-[34px] text-right text-[13.5px]"
            style={{ fontWeight: 300, letterSpacing: "-0.01em", color: cor }}
          >
            {Math.round(pct)}%
          </span>
        </span>
      )}
    </li>
  );
}
