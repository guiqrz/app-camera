import type { ReactNode } from "react";

/** As 4 pastilhas de cor do prototipo, na ordem em que ele as usa. */
export type CorDoIcone = "azul" | "verde" | "ambar" | "roxo";

type Props = {
  /** Titulo curto no topo do card ("Alunos"). */
  rotulo: string;
  /** Numero grande. String pronta ("13,4") ou numero. */
  valor: ReactNode;
  /** Linha de apoio abaixo do valor. */
  nota?: ReactNode;
  /** Icone dentro da pastilha, empurrado pra direita pelo `margin-left:auto`. */
  icone: ReactNode;
  cor: CorDoIcone;
  /** Pastilha de variação ao lado do valor (`.selo-var` — "+5 pts", "-61 pts"). */
  selo?: ReactNode;
  /**
   * Conteudo que SANGRA ate' a borda do card — o mini-grafico de tendencia
   * (`.tendencia`). Precisa de `overflow:hidden` no card pra nao vazar por
   * cima do raio da borda, entao vive num slot proprio, fora do `rodape`
   * normal (que continua com respiro, como as barrinhas de frequencia).
   */
  grafico?: ReactNode;
  /** Conteudo extra no pe do card — as barrinhas de frequencia, por exemplo. */
  rodape?: ReactNode;
  /**
   * Cartao de DIAGNOSTICO (FPS e MQTT na tela de Camera): mesma familia, mas
   * menor e com a pastilha neutra em vez de colorida.
   *
   * Existe porque esses dois nao sao metrica pedagogica — sao saude da captura.
   * No mesmo peso visual competiriam com Chamada e Dispersao, que sao o motivo
   * de o professor abrir a tela durante a aula.
   */
  discreto?: boolean;
};

/**
 * Card de numero da tela Minhas Aulas — o `.numero` do prototipo.
 *
 * A altura e' FIXA (178px), nao `aspect-ratio`: com proporcao, o card cresce
 * junto com a largura da coluna, e era isso que o deixava grande. Altura fixa
 * desacopla o card da largura, e o `mt-auto` do valor empurra o numero pro pe
 * do card, mantendo o alinhamento entre os quatro.
 *
 * As cores da pastilha saem dos tokens --materia-*, que ja' existem no app e
 * batem exatamente com os --mat-* do prototipo nos dois temas.
 */
export function CartaoNumero({
  rotulo,
  valor,
  nota,
  icone,
  cor,
  selo,
  grafico,
  rodape,
  discreto = false,
}: Props) {
  return (
    <div
      className={`border-border-default bg-surface flex flex-col overflow-hidden rounded-[12px] border ${
        discreto
          ? "px-[16px] pt-[14px] pb-[14px]"
          : "min-h-[178px] px-[18px] pt-[17px] pb-[16px]"
      }`}
      style={{ backdropFilter: "var(--blur-card)" }}
    >
      <div className="text-text-body flex items-start gap-2 text-[13px] leading-[1.25] font-semibold">
        {rotulo}
        <span
          className={`ml-auto grid flex-none place-items-center ${
            discreto ? "h-[30px] w-[30px] rounded-[9px]" : "h-[42px] w-[42px] rounded-[12px]"
          }`}
          style={
            discreto
              ? { background: "var(--surface-2)", color: "var(--text-muted)" }
              : {
                  background: `var(--materia-${cor}-bg)`,
                  color: `var(--materia-${cor}-fg)`,
                }
          }
          aria-hidden
        >
          {icone}
        </span>
      </div>

      {/* `.valor-linha`: numero + selo lado a lado. Sem selo, o numero sobe
          sozinho igual antes — o `mt-auto` continua no wrapper, nao no
          numero, entao os dois casos ficam ancorados no mesmo lugar. */}
      <div className={`flex items-center gap-2 ${discreto ? "mt-2" : "mt-auto"}`}>
        <div
          className={`text-text tabular-nums ${discreto ? "text-[20px]" : "text-[40px]"}`}
          style={{ fontWeight: 300, letterSpacing: "-0.035em", lineHeight: 1 }}
        >
          {valor}
        </div>
        {selo}
      </div>

      {nota && <div className="text-text-muted mt-[5px] text-[12px]">{nota}</div>}

      {rodape}

      {/* Sangra ate' a borda: margin negativo compensa o padding do card
          (18px nas laterais, 16px embaixo) + 2px de folga, como o
          `margin: 8px -18px -16px` do protótipo. */}
      {grafico && <div className="mx-[-18px] mt-2 mb-[-16px]">{grafico}</div>}
    </div>
  );
}
