import { BotaoConversarIa } from "@/components/relatorio/botao-conversar-ia";
import { IconEstrela } from "@/components/ui/icons";

type Props = {
  recomendacoes: string[];
  /** Sessão desta aula, pro atalho que abre o Cup AI com ela anexada. */
  sessaoId: number;
};

/**
 * "Sugestão da Cupcam" — o `.recomendacao` do protótipo.
 *
 * Uma LINHA horizontal: pastilha da estrela, o texto no meio e o botão de
 * vidro encostado à direita. Antes isto era um card roxo de gradiente com
 * texto branco, que destoava de todos os outros blocos da tela — ele apontou
 * em 14/08 que estava "totalmente errado".
 *
 * O botão é o mesmo `.op-acao` de "Gerar com a Cup AI" da tela Minhas Aulas:
 * pílula de vidro com a moldura acesa por gradiente mascarado.
 */
export function SugestaoDaCupcam({ recomendacoes, sessaoId }: Props) {
  const texto =
    recomendacoes.length > 0
      ? recomendacoes.join(" ")
      : "Esta aula ainda não gerou recomendações.";

  return (
    <div className="flex flex-wrap items-center gap-[14px]">
      <span
        className="grid h-[34px] w-[34px] flex-none place-items-center rounded-[11px]"
        style={{
          background: "color-mix(in srgb, var(--graf-linha) 17%, transparent)",
          color: "var(--graf-linha)",
        }}
        aria-hidden
      >
        <IconEstrela size={17} />
      </span>

      <p className="text-text-body m-0 min-w-[220px] max-w-[74ch] flex-1 text-[13.5px] leading-[1.55]">
        {texto}
      </p>

      {/* `ml-auto` encosta no canto direito do card, como no protótipo. */}
      <BotaoConversarIa sessaoId={sessaoId} />
    </div>
  );
}
