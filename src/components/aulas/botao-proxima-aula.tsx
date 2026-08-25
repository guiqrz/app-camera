"use client";

import { useState } from "react";

import { IconEstrela } from "@/components/ui/icons";
import { dataDoTimestamp, formatarDataExtensa } from "@/lib/format";
import type { SugestaoDaProximaAula } from "@/lib/types";

/**
 * Feature F11 — a sugestao da proxima aula, sob demanda.
 *
 * POR QUE SOB DEMANDA, E NAO CARREGADA COM A TELA
 * ----------------------------------------------
 * A rota gasta uma chamada de IA. Carregada junto da pagina, toda abertura de
 * "Minhas aulas" — inclusive as dezenas de vezes por dia em que o professor
 * so' quer ver a lista — pagaria uma geracao de texto que ele nao pediu.
 *
 * O clique tambem tem valor de produto: sugestao que aparece sozinha e' opiniao
 * nao solicitada do software sobre o trabalho dele. Pedida, e' ferramenta.
 */
export function BotaoProximaAula({ turmaId }: { turmaId: number }) {
  const [sugestao, setSugestao] = useState<SugestaoDaProximaAula | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function pedirSugestao() {
    setCarregando(true);
    setErro(null);
    try {
      const resposta = await fetch(`/api/proxima-aula/${turmaId}`, {
        method: "POST",
      });
      const corpo = await resposta.json();

      if (!resposta.ok) {
        // A mensagem vem da ponte, que ja' traduziu o status. Nunca inventar
        // causa aqui: dizer "a IA está fora do ar" quando o que falhou foi a
        // rede seria afirmar o que não se verificou.
        setErro(corpo?.erro ?? "Não foi possível gerar a sugestão.");
        return;
      }
      setSugestao(corpo as SugestaoDaProximaAula);
    } catch {
      setErro("Não foi possível falar com o servidor.");
    } finally {
      setCarregando(false);
    }
  }

  if (sugestao?.tem_cronograma && sugestao.tem_proxima) {
    return (
      <div
        className="border-t pt-[13px]"
        style={{ borderColor: "var(--vidro-forte-borda)" }}
      >
        <div className="text-text-muted text-[9.5px] font-bold tracking-[0.11em] uppercase">
          Próxima aula
        </div>

        <p className="text-text mt-[3px] text-[13.5px] font-semibold">
          {sugestao.conteudo_planejado}
        </p>
        <p className="text-text-muted mt-[2px] text-[12px]">
          {formatarDataExtensa(dataDoTimestamp(sugestao.data))}
          {sugestao.materia && ` · ${sugestao.materia}`}
        </p>

        {/* O parágrafo da IA vem DEPOIS do conteúdo planejado e visualmente
            mais leve: o conteúdo é o que o PROFESSOR escreveu no cronograma, a
            sugestão é opinião do app sobre ele. Invertida, leria como ordem. */}
        <p className="text-text-body mt-[9px] text-[13px] leading-relaxed">
          {sugestao.sugestao}
        </p>

        <p className="text-text-muted mt-[7px] text-[11.5px]">
          Sugestão da Cup AI a partir do seu cronograma e das últimas aulas.
          Você conhece a turma — o app conhece o calendário.
        </p>
      </div>
    );
  }

  if (sugestao?.tem_cronograma && !sugestao.tem_proxima) {
    return (
      <p
        className="text-text-muted border-t pt-[13px] text-[12.5px]"
        style={{ borderColor: "var(--vidro-forte-borda)" }}
      >
        Não há próxima aula prevista no cronograma deste período.
      </p>
    );
  }

  return (
    <div
      className="flex flex-wrap items-center gap-3 border-t pt-[13px]"
      style={{ borderColor: "var(--vidro-forte-borda)" }}
    >
      <button
        type="button"
        onClick={pedirSugestao}
        disabled={carregando}
        className="text-text-brand flex flex-none items-center gap-[7px] rounded-full px-5 py-[10px] text-[12.5px] font-semibold transition-transform not-disabled:hover:-translate-y-px disabled:opacity-60"
        style={{
          background: "var(--vidro-botao)",
          backdropFilter: "blur(28px) saturate(175%)",
          border: "1px solid var(--vidro-forte-borda)",
        }}
      >
        <IconEstrela size={13} className="opacity-90" />
        {carregando ? "Pensando…" : "O que dar na próxima aula?"}
      </button>

      {erro && (
        <p className="text-[12px]" style={{ color: "var(--danger-fg)" }}>
          {erro}
        </p>
      )}
    </div>
  );
}
