"use client";

import { useState } from "react";

import { IconCopiar } from "@/components/ui/icons";
import type { DiarioDaAula } from "@/lib/types";

type Props = {
  sessaoId: number;
};

/**
 * "Copiar diário" — no CABEÇALHO da tela, como no protótipo.
 *
 * O diário é o único artefato que nasce para SAIR do app: o professor copia e
 * cola no diário oficial da escola. Ele leva presença e conteúdo, e é montado
 * por formatação pura no backend (`cupcam/persistencia/diario.py`), sem IA —
 * o texto que ele cola é byte a byte o que o backend gerou.
 *
 * Antes isto era uma seção inteira no meio da tela ("Diário de classe"), que
 * repetia o conteúdo da aula logo acima dela. O protótipo não tem esse bloco:
 * o conteúdo vive em "Conteúdo da aula" e o diário é só esta AÇÃO.
 *
 * O texto é buscado no clique, não na montagem da tela: é um artefato que só
 * existe quando o professor pede, e buscar antes gastaria uma requisição em
 * toda visita ao relatório.
 */
export function BotaoCopiarDiario({ sessaoId }: Props) {
  const [estado, setEstado] = useState<"parado" | "copiando" | "copiado">(
    "parado",
  );
  const [erro, setErro] = useState<string | null>(null);

  const copiar = async () => {
    setEstado("copiando");
    setErro(null);
    try {
      const resposta = await fetch(`/api/diario/${sessaoId}`);
      if (!resposta.ok) {
        setErro("Não foi possível montar o diário desta aula.");
        setEstado("parado");
        return;
      }
      const diario = (await resposta.json()) as DiarioDaAula;
      await navigator.clipboard.writeText(diario.texto);
      setEstado("copiado");
      setTimeout(() => setEstado("parado"), 2000);
    } catch {
      // `navigator.clipboard` falha fora de HTTPS e quando o navegador nega a
      // permissão. Dizer isso é melhor que deixar o professor achando que o
      // botão está quebrado.
      setErro("Não foi possível copiar. Verifique a permissão da área de transferência.");
      setEstado("parado");
    }
  };

  return (
    <span className="ml-auto flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={copiar}
        disabled={estado === "copiando"}
        className="border-border-default text-text hover:bg-surface-2 inline-flex items-center gap-[7px] rounded-[9px] border px-[13px] py-2 text-[12.5px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60"
        style={{ background: "var(--surface-2)" }}
      >
        <IconCopiar size={14} />
        {estado === "copiado"
          ? "Copiado!"
          : estado === "copiando"
            ? "Montando…"
            : "Copiar diário"}
      </button>

      {erro !== null && (
        <span
          className="max-w-[34ch] text-right text-[11px]"
          style={{ color: "var(--danger-fg)" }}
          role="alert"
        >
          {erro}
        </span>
      )}
    </span>
  );
}
