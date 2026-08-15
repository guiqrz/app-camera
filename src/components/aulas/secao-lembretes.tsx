"use client";

import { useState } from "react";

import { CartaoNumero } from "@/components/aulas/cartao-numero";
import { PainelLembretes } from "@/components/aulas/painel-lembretes";
import { IconSino } from "@/components/ui/icons";
import type { Lembrete } from "@/lib/types";

type Props = {
  lembretesIniciais: Lembrete[];
  /** O que vai ANTES do painel, na fileira de cards (os outros números). */
  outrosNumeros: React.ReactNode;
};

/**
 * Dona da lista de lembretes — o card de número e o painel leem o MESMO estado.
 *
 * Antes o card ficava na página (server component, lendo `visao.lembretes`) e o
 * painel tinha o próprio `useState`. Criar um lembrete atualizava só o painel:
 * o card continuava mostrando a contagem do momento em que a página carregou,
 * e o professor via "1 aberto" embaixo de um card dizendo "0". Era a
 * desconexão que ele reportou em 14/08.
 *
 * Subir o estado pra cá é o que os une. O card deixa de ser servidor, mas ele
 * já dependia de dado que muda no navegador — servidor ali era a escolha
 * errada desde o começo.
 */
export function SecaoLembretes({ lembretesIniciais, outrosNumeros }: Props) {
  const [lembretes, setLembretes] = useState(lembretesIniciais);

  const abertos = lembretes.filter((l) => !l.feito).length;

  return (
    <>
      {/* `auto-fit` com mínimo de 210px, igual ao protótipo: os cards
          reflutuam sozinhos e não há breakpoint cravado. */}
      <div
        className="grid gap-[12px]"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))" }}
      >
        {outrosNumeros}

        <CartaoNumero
          rotulo="Lembretes"
          valor={abertos}
          nota={
            lembretes.length === 0
              ? "nenhum anotado"
              : `de ${lembretes.length} ${lembretes.length === 1 ? "anotado" : "anotados"}`
          }
          icone={<IconSino size={21} />}
          cor="ambar"
        />
      </div>

      <PainelLembretes
        lembretes={lembretes}
        aoMudar={setLembretes}
      />
    </>
  );
}
