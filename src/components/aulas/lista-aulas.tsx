import Link from "next/link";

import { IconSetaDireita } from "@/components/ui/icons";
import type { AulaCard } from "@/lib/types";

/** Quantas aulas a lista mostra antes do botão "Ver todas". */
const QUANTAS_NA_LISTA = 5;

const MES_CURTO = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez",
];

/**
 * "AAAA-MM-DD" -> { dia: "07", mes: "ago" }. Fatia a string, sem `new Date`.
 *
 * `new Date("2026-08-07")` é meia-noite UTC e, no fuso do Brasil (-03), volta
 * pro dia 6 — o quadrado mostraria a data errada em metade do dia.
 */
function partesDaData(iso: string) {
  const [, mes, dia] = iso.split("-");
  return { dia, mes: MES_CURTO[Number(mes) - 1] ?? mes };
}

type ListaAulasProps = {
  aulas: AulaCard[];
  /** Id da turma desta página — vai nos links, já que `AulaCard` não o carrega. */
  turmaId: number;
  nomeTurma: string;
};

/**
 * "Aulas desta turma" — a lista compacta do protótipo (`.aulas`).
 *
 * Mostra as 5 mais recentes e manda o resto pro Relatórios pelo botão do
 * rodapé. A BUSCA, o filtro de data e os chips de engajamento saíram em
 * 14/08: eles não existem no protótipo, e a tela de Relatórios já tem busca e
 * filtros de verdade — ter os dois duplicava a mesma função em duas telas, com
 * a versão pior aqui.
 *
 * Server component: sem estado nem interação depois que os filtros saíram, um
 * `"use client"` só custaria JavaScript no navegador sem dar nada em troca.
 */
export function ListaAulas({ aulas, turmaId, nomeTurma }: ListaAulasProps) {
  const visiveis = aulas.slice(0, QUANTAS_NA_LISTA);

  return (
    <section
      className="bg-surface border-border-default overflow-hidden rounded-[12px] border"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      {/* `.card-topo`: padding 15px 17px 11px, h2 de 16px e a contagem
          apagada ao lado — "5 de 17" no protótipo. */}
      <div className="flex flex-wrap items-center gap-[10px] px-[17px] pt-[15px] pb-[11px]">
        <h2
          className="text-text text-[16px] font-semibold"
          style={{ letterSpacing: "-0.16px" }}
        >
          Aulas desta turma
        </h2>
        {aulas.length > 0 && (
          <span
            className="text-text-muted text-[12.5px] tabular-nums"
            style={{ fontWeight: 400 }}
          >
            {visiveis.length} de {aulas.length}
          </span>
        )}
      </div>

      {aulas.length === 0 ? (
        <p className="text-text-muted px-[17px] pb-[17px] text-[12.5px]">
          Nenhuma aula registrada em {nomeTurma} ainda.
        </p>
      ) : (
        <>
          <div className="flex flex-col px-[7px] pt-[2px] pb-[5px]">
            {visiveis.map((aula) => (
              <LinhaDaAula key={aula.sessao_id} aula={aula} turmaId={turmaId} />
            ))}
          </div>

          {/* Pastilha de tinta suave, alinhada à esquerda na coluna do texto.
              Não é barra de largura cheia: com as linhas compactas acima, ela
              pesaria mais que a lista inteira. */}
          <div className="px-[9px] pt-[3px] pb-[10px]">
            <Link
              href={`/relatorios/turma/${turmaId}`}
              className="text-text-brand inline-flex items-center gap-[6px] rounded-full border px-[13px] py-[7px] text-[12px] font-semibold transition-colors"
              style={{
                background: "var(--primary-soft)",
                borderColor: "var(--border-default)",
              }}
            >
              Ver todas as {aulas.length} aulas
              <IconSetaDireita size={14} />
            </Link>
          </div>
        </>
      )}
    </section>
  );
}

/**
 * Uma linha da lista (`.aula`): quadrado de data à esquerda, texto à direita.
 *
 * A altura é mandada pelo QUADRADO (37px), não pelo texto — é nele que se mexe
 * se a linha ficar apertada ou folgada demais.
 */
function LinhaDaAula({ aula, turmaId }: { aula: AulaCard; turmaId: number }) {
  const { dia, mes } = partesDaData(aula.data);
  // "Sem registro" e' a AUSENCIA DE TITULO (nenhum topico gravado), nao a
  // ausencia de recomendacao: a aula pode ter recomendacao da IA sem nunca ter
  // tido o conteudo registrado.
  const semRegistro = aula.titulo === null;

  return (
    <Link
      href={`/relatorios/sessao/${aula.sessao_id}?turma=${turmaId}`}
      className="hover:bg-surface-2 grid grid-cols-[44px_1fr] items-center gap-[14px] rounded-[9px] px-[9px] py-[10px] no-underline transition-colors"
    >
      {/* Quadrado de vidro com a data — mesmo material dos cards, em
          miniatura.

          44px, e não os 37px do CSS do protótipo: ele pediu as linhas "um
          pouco maiores" em 14/08, e é O QUADRADO que manda na altura da linha
          (o texto cabe folgado em qualquer um dos dois). 37 + padding dava
          51px por linha; 44 + padding dá ~64px, que é a altura da referência
          que ele mandou.

          BORDA em `--surface-2`, e não `border-border-default`: essa era a
          "mancha clara" que ele viu em 14/08. `--border` é opaco (.55 no
          claro / .17 no escuro) e o `<Link>` ao redor não tem NENHUMA borda —
          um quadrado de 44px com moldura sólida sozinho na linha lia como
          remendo colado, não como parte do vidro. `--surface-2` é o mesmo
          material translúcido do resto do vidro, só que mais discreto: ele
          desenha o quadrado sem competir com o card que o contém. */}
      <span
        className="flex h-[44px] w-[44px] flex-col items-center justify-center gap-px rounded-[10px]"
        style={{
          background: "var(--surface-2)",
          backdropFilter: "var(--blur-card)",
        }}
      >
        <span
          className="text-text block text-[14px] tabular-nums"
          style={{ fontWeight: 300, lineHeight: 1.05 }}
        >
          {dia}
        </span>
        <span className="text-text-muted block text-[8px] font-semibold tracking-[0.05em] uppercase">
          {mes}
        </span>
      </span>

      <span className="min-w-0">
        <span className="flex min-w-0 items-center gap-2">
          <span className="text-text truncate text-[13.5px] leading-[1.25] font-semibold">
            {aula.titulo ?? "Aula sem registro"}
          </span>

          {/* Selo de ação pendente, não decoração: a aula sem registro é a
              única que pede algo do professor. */}
          {semRegistro && (
            <span
              className="flex-none rounded-full px-[7px] py-[2px] text-[9.5px]"
              style={{
                background: "var(--warn-bg)",
                color: "var(--warn-fg)",
                fontWeight: 650,
                letterSpacing: "0.02em",
              }}
            >
              registrar
            </span>
          )}
        </span>

        <span
          className="text-text-muted mt-[3px] block truncate text-[12.5px] leading-[1.35]"
          style={{ fontWeight: 300 }}
        >
          {aula.conteudo_resumo ??
            aula.resumo ??
            "Nada foi anotado nesta aula"}
        </span>
      </span>
    </Link>
  );
}
