import type { ReactNode } from "react";

type StatCardProps = {
  /** Rotulo curto em maiuscula, como no desenho ("ENGAJAMENTO MEDIO"). */
  rotulo: string;
  /** Valor grande. String pronta ("82%", "09:50") ou "Sem dados". */
  valor: ReactNode;
  /** Linha de apoio abaixo do valor. */
  apoio?: ReactNode;
  /** Icone no canto superior direito. */
  icone?: ReactNode;
  /** Variante "brand" pinta o card com a cor da marca (card de destaque). */
  variante?: "padrao" | "brand";
};

/**
 * Cartao de estatistica reutilizavel — a unidade dos paineis de numeros nas
 * telas de Relatorio e Chamada.
 */
export function StatCard({
  rotulo,
  valor,
  apoio,
  icone,
  variante = "padrao",
}: StatCardProps) {
  const brand = variante === "brand";

  return (
    <div
      className="flex flex-col rounded-2xl p-5"
      style={
        brand
          ? {
              background: "var(--surface-brand)",
              color: "var(--text-on-brand)",
              boxShadow: "var(--shadow-raise)",
            }
          : {
              background: "var(--surface)",
              border: "1px solid var(--border)",
              boxShadow: "var(--shadow-card)",
            }
      }
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <span
          className="text-[11px] font-extrabold tracking-wide uppercase"
          style={{ color: brand ? "rgba(255,255,255,0.85)" : "var(--text-muted)" }}
        >
          {rotulo}
        </span>
        {icone && <span className="flex-none">{icone}</span>}
      </div>

      <div
        className="text-3xl font-extrabold"
        style={{ color: brand ? "var(--text-on-brand)" : "var(--text)" }}
      >
        {valor}
      </div>

      {apoio && (
        <div
          className="mt-1 text-[13px]"
          style={{ color: brand ? "rgba(255,255,255,0.85)" : "var(--text-muted)" }}
        >
          {apoio}
        </div>
      )}
    </div>
  );
}
