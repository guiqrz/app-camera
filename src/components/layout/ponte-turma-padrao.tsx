"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { lerTurmaPadrao } from "@/lib/preferencias";
import type { Turma } from "@/lib/types";

type PonteTurmaPadraoProps = {
  /** Turmas existentes, para validar a preferencia antes de navegar. */
  turmas: Turma[];
  /** Prefixo da rota de destino, ex.: "/chamada/turma" ou "/relatorios/turma". */
  baseRota: string;
  /** Esqueleto exibido durante a resolucao (o mesmo loading.tsx da rota). */
  children: React.ReactNode;
};

/**
 * Encaminha para a turma preferida do professor.
 *
 * A preferencia "Turma padrao" vive no localStorage (ver lib/preferencias.ts),
 * que existe so' no navegador — um `redirect` de servidor nao tem como le-la.
 * Por isso a entrada da secao passa por aqui: o servidor entrega a lista de
 * turmas, e o navegador escolhe qual abrir.
 *
 * Cai na primeira turma da lista quando nao ha preferencia OU quando a turma
 * preferida nao existe mais (excluida depois de ter sido escolhida — o
 * localStorage nao sabe disso, e navegar pra ela daria um 404).
 */
export function PonteTurmaPadrao({
  turmas,
  baseRota,
  children,
}: PonteTurmaPadraoProps) {
  const router = useRouter();

  useEffect(() => {
    if (turmas.length === 0) return;

    const preferida = lerTurmaPadrao();
    const existe =
      preferida !== null && turmas.some((turma) => turma.id === preferida);

    const destino = existe ? preferida : turmas[0].id;

    // `replace`, nao `push`: esta ponte nao deve virar uma parada no historico,
    // senao o botao voltar do navegador cairia aqui e encaminharia de novo.
    router.replace(`${baseRota}/${destino}`);
  }, [turmas, baseRota, router]);

  return <>{children}</>;
}
