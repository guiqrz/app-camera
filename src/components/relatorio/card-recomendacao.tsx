import { IconIA } from "@/components/ui/icons";

type CardRecomendacaoProps = {
  recomendacoes: string[];
};

/**
 * Card de recomendacao pedagogica gerada pelo sistema.
 *
 * O campo "Converse com a I.A..." e' decorativo: o chat em si e' de outro
 * servico, fora deste app. Por isso ele nao e' um input funcional — nao
 * prometemos uma acao que esta tela nao entrega.
 */
export function CardRecomendacao({ recomendacoes }: CardRecomendacaoProps) {
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

      <div
        className="mt-4 rounded-xl px-4 py-3 text-[13px] opacity-80"
        style={{ background: "rgba(0,0,0,0.18)" }}
      >
        Converse com a I.A...
      </div>
    </div>
  );
}
