"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { IconCalendario } from "@/components/ui/icons";

type SeletorDataRelatorioProps = {
  turmaId: number;
};

/**
 * Seletor de data do Relatorio geral.
 *
 * Escolher uma data nao filtra aqui: leva o professor para "Minhas Aulas" da
 * mesma turma, ja filtrada naquela data (parametro ?data=), onde ele acha a
 * aula especifica e abre o relatorio dela. Fluxo pedido pelo usuario.
 */
export function SeletorDataRelatorio({ turmaId }: SeletorDataRelatorioProps) {
  const router = useRouter();
  const [pendente, iniciarTransicao] = useTransition();

  return (
    <label
      className="border-border-default bg-surface flex items-center gap-2.5 rounded-xl border px-4 py-2.5"
      style={{ opacity: pendente ? 0.6 : 1 }}
    >
      <span className="flex-none" style={{ color: "var(--primary)" }}>
        <IconCalendario />
      </span>
      <span className="sr-only">Escolher data para ver as aulas</span>
      <input
        type="date"
        disabled={pendente}
        onChange={(evento) => {
          const data = evento.target.value;
          if (!data) return;
          iniciarTransicao(() =>
            router.push(`/aulas/${turmaId}?data=${encodeURIComponent(data)}`),
          );
        }}
        className="text-text bg-transparent text-sm font-bold outline-none"
        aria-label="Escolher data"
      />
    </label>
  );
}
