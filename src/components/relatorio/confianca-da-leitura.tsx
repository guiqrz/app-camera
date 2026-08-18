import type { RelatorioDaSessao } from "@/lib/types";

/** Abaixo disto a leitura cobriu pouco da aula pra o numero valer sozinho. */
const COBERTURA_BAIXA = 70;
/** Acima disto a camera passou tempo demais sem saber classificar quem viu. */
const INCERTEZA_ALTA = 30;

type Props = {
  leitura: RelatorioDaSessao["leitura"];
};

/**
 * A linha que diz o quanto o engajamento acima se sustenta.
 *
 * Existe porque "45% de engajamento" medido em 20% da aula e "45%" medido na
 * aula inteira aparecem iguais na tela e nao valem o mesmo. Duas coisas
 * distintas limitam a leitura, e a linha separa as duas:
 *
 *   - COBERTURA: quanto do tempo tinha alguem na sala pra medir. Sala vazia
 *     nao e' desatencao — e' ausencia de medicao.
 *   - INCERTEZA: quanto do tempo observado a camera viu alguem e nao soube
 *     classificar (confianca abaixo do limiar do modelo).
 *
 * ⚠️ So' aparece quando a leitura FOI limitada. Numa aula bem medida a linha
 * some inteira: avisar "cobertura 98%" em toda aula vira ruido que o professor
 * aprende a ignorar — e ai o aviso nao funciona no dia em que importa.
 *
 * Nao usa vermelho. Cobertura baixa nao e' erro do professor nem veredito
 * sobre a turma: e' limite do que a camera conseguiu ver.
 */
export function ConfiancaDaLeitura({ leitura }: Props) {
  const { cobertura_pct, incerteza_pct, leituras_uteis, leituras_totais } = leitura;

  // Sem leitura nenhuma a tela ja mostra "—" no card de engajamento; repetir
  // aqui nao acrescenta nada.
  if (cobertura_pct === null || leituras_totais === 0) return null;

  const coberturaBaixa = cobertura_pct < COBERTURA_BAIXA;
  const incertezaAlta = incerteza_pct !== null && incerteza_pct >= INCERTEZA_ALTA;
  if (!coberturaBaixa && !incertezaAlta) return null;

  const avisos: string[] = [];
  if (coberturaBaixa) {
    avisos.push(
      `a câmera só tinha alguém para medir em ${cobertura_pct}% da aula`,
    );
  }
  if (incertezaAlta) {
    avisos.push(
      `em ${incerteza_pct}% do tempo observado ela não soube classificar quem viu`,
    );
  }

  return (
    <div
      className="border-border-default bg-surface flex items-start gap-[10px] rounded-[12px] border px-[15px] py-[12px]"
      style={{ backdropFilter: "var(--blur-card)" }}
    >
      <span
        className="mt-[1px] grid h-[22px] w-[22px] flex-none place-items-center rounded-[7px]"
        style={{
          background: "color-mix(in srgb, var(--warn-fg) 14%, transparent)",
          color: "var(--warn-fg)",
        }}
        aria-hidden
      >
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8v5" />
          <path d="M12 16.5h.01" />
        </svg>
      </span>

      <div className="text-text-muted flex flex-col gap-[3px] text-[11.5px] leading-[1.45]">
        <span className="text-text" style={{ fontWeight: 500 }}>
          Leitura parcial desta aula
        </span>
        <span>
          {/* Frase unica: dois avisos viram "X e Y", nao duas linhas soltas. */}
          O engajamento acima vale para o tempo medido — {avisos.join(" e ")}.
        </span>
        <span className="opacity-70 tabular-nums">
          {leituras_uteis} de {leituras_totais} leituras com alguém em cena
        </span>
      </div>
    </div>
  );
}
