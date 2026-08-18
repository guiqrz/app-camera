import type { ReactNode } from "react";

/**
 * As faixas de SIGNIFICADO do numero. O acento sai daqui, nao de gosto.
 *
 * ⚠️ A escala e' RELATIVA a media historica da turma, nunca absoluta. Com
 * escala absoluta, 11% — que e' engajamento real de aula boa neste projeto —
 * cairia em "ruim" vermelho. O percentual conta so' quem a camera classificou
 * como ATENTO; todo o resto cai em `indeterminado`. Vermelho ali acusaria o
 * professor de algo que o dado nao sustenta.
 */
export type FaixaNumero = "bom" | "atencao" | "ruim" | "neutro";

const ACENTO: Record<FaixaNumero, string> = {
  bom: "var(--materia-verde-fg)",
  atencao: "var(--materia-ambar-fg)",
  ruim: "var(--danger-fg)",
  neutro: "var(--text-muted)",
};

type Props = {
  rotulo: string;
  valor: ReactNode;
  /** Linha de apoio no rodape do card. */
  apoio?: ReactNode;
  icone: ReactNode;
  faixa?: FaixaNumero;
  /**
   * Etiqueta de variacao logo abaixo do numero ("10 pp abaixo da média").
   *
   * `desce` decide a seta e a cor. O texto vem em PONTOS PERCENTUAIS, nunca em
   * razao — ver a nota de `faixaDaVariacao` em `vista-relatorio.tsx`.
   */
  tag?: { texto: string; desce: boolean };
};

/**
 * Card de numero da tela de UMA aula — o `.num-card` do prototipo.
 *
 * A cor entra em dose "so acentos": o fundo fica neutro e o tom vive so' na
 * pastilha de 30px do icone. Cinco cards com fundo pastel lado a lado
 * competiriam com o grafico logo abaixo, que e' o conteudo principal da tela.
 *
 * `margin: auto 0` no valor e' o que o CENTRALIZA na vertical — empurra por
 * cima e por baixo em iguais. Com `margin-top: auto` na legenda (a versao
 * anterior), o numero subia e abria vao no meio do card.
 */
export function NumeroDaAula({
  rotulo,
  valor,
  apoio,
  icone,
  faixa = "neutro",
  tag,
}: Props) {
  const acento = ACENTO[faixa];

  return (
    <div
      className="border-border-default bg-surface relative flex min-h-[158px] flex-col items-start overflow-hidden rounded-[12px] border px-[15px] pt-[14px] pb-[15px]"
      style={{ backdropFilter: "var(--blur-card)" }}
      title={tag && typeof apoio === "string" ? apoio : undefined}
    >
      {/* `pr` reserva a coluna da pastilha: sem ela o rotulo longo passaria
          por baixo do icone. */}
      <div
        className="text-text-muted flex items-center pr-[38px] text-[11.5px]"
        style={{ fontWeight: 300 }}
      >
        {rotulo}
      </div>

      <span
        className="absolute top-[13px] right-[14px] grid h-[30px] w-[30px] flex-none place-items-center rounded-[9px]"
        style={{
          background: `color-mix(in srgb, ${acento} 14%, transparent)`,
          color: acento,
        }}
        aria-hidden
      >
        {icone}
      </span>

      <div
        className="text-text my-auto text-[38px] tabular-nums"
        style={{ fontWeight: 300, letterSpacing: "-0.03em", lineHeight: 1.08 }}
      >
        {valor}
      </div>

      {/* A etiqueta herda o acento do card, mas por um token de TEXTO: o
          `--grafico-*` foi escolhido pra linha de gráfico, e em 11.5px no tema
          claro ele reprova em AA. Os pares `--ok-fg`/`--warn-fg` são os de
          texto do mesmo verde/âmbar. */}
      {tag && (
        <span
          className="mt-[7px] inline-flex flex-none items-center gap-[4px] rounded-full px-[7px] py-[2px] text-[10.5px] font-semibold tabular-nums"
          style={{
            background: tag.desce
              ? "color-mix(in srgb, var(--warn-fg) 14%, transparent)"
              : "color-mix(in srgb, var(--ok-fg) 14%, transparent)",
            color: tag.desce ? "var(--warn-fg)" : "var(--ok-fg)",
          }}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M12 5v14" />
            <path d={tag.desce ? "m19 12-7 7-7-7" : "m5 12 7-7 7 7"} />
          </svg>
          {tag.texto}
        </span>
      )}

      {/* Regra do artifact: "11% NUNCA sozinho" — card sempre mostra tag OU
          apoio, nunca os dois (competiriam por espaço) nem nenhum (o numero
          ficaria sem contexto). Com tag, o apoio vira SO' o `title` do card
          (tooltip) em vez de texto fixo — ver o `title` acima. */}
      {apoio && !tag && (
        <div className="text-text-muted pt-[7px] text-[11.5px] leading-[1.4]">
          {apoio}
        </div>
      )}
    </div>
  );
}
