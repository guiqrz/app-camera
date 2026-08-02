import { BotaoConversarIa } from "@/components/relatorio/botao-conversar-ia";
import { IconIA } from "@/components/ui/icons";

type CardRecomendacaoProps = {
  recomendacoes: string[];
  /** Sessao desta aula, pro atalho que abre o Cup AI com ela anexada. */
  sessaoId: number;
};

/**
 * Card de recomendacao pedagogica gerada pelo sistema.
 *
 * O rodape era um campo DECORATIVO ("Converse com a I.A..."), de quando o chat
 * morava fora deste app. Agora e' o atalho real pro Cup AI, e so' aparece
 * quando a aula tem transcricao pronta — ver BotaoConversarIa.
 */
export function CardRecomendacao({
  recomendacoes,
  sessaoId,
}: CardRecomendacaoProps) {
  const temRecomendacao = recomendacoes.length > 0;

  return (
    <div
      className="rounded-2xl p-5 text-white"
      style={{
        background: "linear-gradient(160deg, var(--violet-500), var(--violet-700))",
        boxShadow: "var(--shadow-raise)",
      }}
    >
      <div className="mb-3 flex items-center gap-2">
        <IconIA size={16} />
        <span className="text-sm font-extrabold">Recomendação por I.A</span>
      </div>

      {temRecomendacao ? (
        <ul className="flex flex-col gap-2">
          {recomendacoes.map((texto, indice) => (
            <li key={indice} className="text-sm leading-relaxed opacity-95">
              {texto}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm leading-relaxed opacity-95">
          Esta aula ainda não gerou recomendações.
        </p>
      )}

      <BotaoConversarIa sessaoId={sessaoId} />
    </div>
  );
}
