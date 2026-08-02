"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { IconIA } from "@/components/ui/icons";
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

  return (
    <Link
      href={`/ia?sessao=${sessaoId}`}
      className="mt-4 flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-[13px] font-extrabold transition-opacity hover:opacity-90"
      style={{ background: "rgba(0,0,0,0.18)" }}
    >
      <IconIA size={15} />
      Conversar sobre esta aula
    </Link>
  );
}
