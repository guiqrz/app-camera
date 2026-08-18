"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { IconEstrela } from "@/components/ui/icons";
import type { Transcricao } from "@/lib/types";

type BotaoConversarIaProps = {
  sessaoId: number;
};

/**
 * Atalho do relatorio pro Cup AI, com esta aula ja' anexada.
 *
 * So' aparece quando a transcricao esta PRONTA. Sem ela, o botao levaria a um
 * chat sem contexto nenhum sobre a aula — o professor perguntaria "o que eu
 * expliquei aqui?" e o modelo responderia no vazio. Transcricao em andamento
 * tambem nao serve: o texto ainda esta pela metade.
 *
 * A checagem e' uma requisicao so', ja' que a tela trata UMA aula — diferente
 * do seletor do chat, onde saber de antemao custaria uma ida por aula da turma.
 */
export function BotaoConversarIa({ sessaoId }: BotaoConversarIaProps) {
  const [disponivel, setDisponivel] = useState(false);

  useEffect(() => {
    let cancelado = false;
    (async () => {
      try {
        const r = await fetch(`/api/transcricao/${sessaoId}`, { cache: "no-store" });
        // 404 e' o caso normal: a aula nao gravou audio. Nao e' erro, e o botao
        // simplesmente nao aparece — sem aviso, porque nao ha nada a corrigir.
        if (!r.ok) return;
        const transcricao = (await r.json()) as Transcricao;
        if (!cancelado) setDisponivel(transcricao.estado === "pronta");
      } catch {
        // Silencioso de proposito: um atalho que nao apareceu nao quebra o
        // relatorio, e um aviso de rede aqui assustaria a toa.
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [sessaoId]);

  if (!disponivel) return null;

  // A MESMA pílula de vidro do "Gerar com a Cup AI" da tela Minhas Aulas — ele
  // pediu explicitamente o mesmo botão nos dois lugares. O fundo escuro de
  // antes (`rgba(0,0,0,.18)`) existia pro card roxo de gradiente, que saiu.
  //
  // A moldura acesa vem de um gradiente que cobre a área toda e é recortado
  // pela máscara: `padding: 1px` + `mask-composite: exclude` deixam visível só
  // a faixa da borda.
  return (
    <Link
      href={`/ia?sessao=${sessaoId}`}
      className="text-text-brand relative isolate ml-auto flex flex-none items-center gap-[7px] rounded-full px-[21px] py-[11px] text-[12.5px] font-semibold no-underline transition-transform hover:-translate-y-px"
      style={{
        background: "var(--vidro-botao)",
        backdropFilter: "blur(28px) saturate(175%)",
      }}
    >
      <span
        className="pointer-events-none absolute inset-0 rounded-full p-px"
        style={{
          background: "var(--moldura-botao)",
          WebkitMask:
            "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
          mask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
          WebkitMaskComposite: "xor",
          maskComposite: "exclude",
        }}
        aria-hidden
      />
      <IconEstrela size={15} className="opacity-90" />
      Falar com a Cup AI sobre esta aula
    </Link>
  );
}
