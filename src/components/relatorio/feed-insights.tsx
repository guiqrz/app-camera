import type { ItemFeedInsight } from "@/lib/types";

type FeedInsightsProps = {
  itens: ItemFeedInsight[];
};

/** Escolhe a cor do marcador do insight pela palavra-chave do tipo/titulo. */
function corDoInsight(item: ItemFeedInsight): string {
  const texto = `${item.tipo ?? ""} ${item.titulo}`.toLowerCase();
  if (/queda|dispers|baix|alerta|aten/.test(texto)) return "var(--danger)";
  if (/alta|alto|pico|otim|posit/.test(texto)) return "var(--ok)";
  return "var(--primary)";
}

/**
 * Feed de insights gerados pelo sistema ao encerrar a aula.
 *
 * Costuma vir vazio (o backend so' grava alguns tipos), entao o estado sem
 * itens e' parte normal da tela, nao um erro.
 */
export function FeedInsights({ itens }: FeedInsightsProps) {
  return (
    <div className="border-border-default bg-surface shadow-card rounded-2xl border p-5">
      <h3 className="text-text mb-4 text-base font-extrabold">Feed de insights</h3>

      {itens.length === 0 ? (
        <p className="text-text-muted text-sm leading-relaxed">
          Nenhum insight destacado para esta aula. Os insights aparecem quando o
          sistema identifica padrões relevantes de atenção da turma.
        </p>
      ) : (
        <ul className="flex flex-col gap-4">
          {itens.map((item, indice) => (
            <li key={indice} className="flex gap-3">
              <span
                className="mt-1.5 h-2.5 w-2.5 flex-none rounded-full"
                style={{ background: corDoInsight(item) }}
                aria-hidden
              />
              <div>
                <p className="text-text text-sm font-bold">{item.titulo}</p>
                <p className="text-text-muted mt-0.5 text-[13px] leading-relaxed">
                  {item.descricao}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
