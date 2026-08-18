"use client";

import { useState } from "react";

import { PainelGeral } from "@/components/configuracoes/painel-geral";
import { PainelPrivacidade } from "@/components/configuracoes/painel-privacidade";
import type { EstadoCamera, Turma } from "@/lib/types";

type Aba = "geral" | "privacidade";

type VistaConfiguracoesProps = {
  turmas: Turma[];
  estadoCamera: EstadoCamera | null;
  salaId: string | null;
  alcanceAutomatico: { alcancadas: number; total: number } | null;
};

/**
 * Vista interativa da tela "Configuracoes".
 *
 * Duas abas. Havia uma terceira, "Conta", que existia apenas travada — o
 * CUPCAM nao tem login (a API se autentica por chave, no servidor). Ela
 * gastava um terco da barra pra dizer que nao existe; agora e' a primeira
 * linha da aba Geral, onde responde a mesma pergunta ("onde configuro minha
 * senha?") sem ocupar a navegacao.
 *
 * As abas reusam o desenho do `.chamada-filtro` — o padrao do app pra "um do
 * grupo esta valendo" — em vez de inventar um segundo desenho pra mesma ideia.
 */
export function VistaConfiguracoes({
  turmas,
  estadoCamera,
  salaId,
  alcanceAutomatico,
}: VistaConfiguracoesProps) {
  const [aba, setAba] = useState<Aba>("geral");

  return (
    <div>
      <div
        className="cfg-abas"
        role="tablist"
        aria-label="Seções das configurações"
      >
        <BotaoAba atual={aba} valor="geral" aoTrocar={setAba}>
          Geral
        </BotaoAba>
        <BotaoAba atual={aba} valor="privacidade" aoTrocar={setAba}>
          Privacidade
        </BotaoAba>
      </div>

      {aba === "geral" && (
        <div role="tabpanel" aria-labelledby="aba-geral">
          <PainelGeral
            turmas={turmas}
            estadoCamera={estadoCamera}
            salaId={salaId}
            alcanceAutomatico={alcanceAutomatico}
          />
        </div>
      )}

      {aba === "privacidade" && (
        <div role="tabpanel" aria-labelledby="aba-privacidade">
          <PainelPrivacidade />
        </div>
      )}
    </div>
  );
}

function BotaoAba({
  atual,
  valor,
  aoTrocar,
  children,
}: {
  atual: Aba;
  valor: Aba;
  aoTrocar: (proxima: Aba) => void;
  children: React.ReactNode;
}) {
  const ativo = atual === valor;

  return (
    <button
      type="button"
      role="tab"
      id={`aba-${valor}`}
      className="cfg-aba"
      aria-selected={ativo}
      onClick={() => aoTrocar(valor)}
    >
      {children}
    </button>
  );
}
