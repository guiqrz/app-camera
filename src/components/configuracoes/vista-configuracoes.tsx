"use client";

import { useState } from "react";

import { PainelConta } from "@/components/configuracoes/painel-conta";
import { PainelEquipe } from "@/components/configuracoes/painel-equipe";
import { PainelGeral } from "@/components/configuracoes/painel-geral";
import { PainelPrivacidade } from "@/components/configuracoes/painel-privacidade";
import type { Equipe, EstadoCamera, MinhaConta, Turma } from "@/lib/types";

type Aba = "geral" | "conta" | "equipe" | "privacidade";

type VistaConfiguracoesProps = {
  turmas: Turma[];
  estadoCamera: EstadoCamera | null;
  salaId: string | null;
  alcanceAutomatico: { alcancadas: number; total: number } | null;
  /** Dados da propria conta; `null` se a API nao respondeu. */
  conta: MinhaConta | null;
  /**
   * Pessoas e convites da escola. `undefined`: a pessoa nao e' admin nem
   * coordenacao, e a aba nem aparece. `null`: a API nao respondeu.
   */
  equipe: Equipe | null | undefined;
};

/**
 * Vista interativa da tela "Configuracoes".
 *
 * Quatro abas desde 27/09/2026: a "Conta" voltou com o login de verdade
 * (nome, senha, sair de todos), e "Equipe" aparece so' pra admin e
 * coordenacao.
 *
 * As abas reusam o desenho do `.chamada-filtro` — o padrao do app pra "um do
 * grupo esta valendo" — em vez de inventar um segundo desenho pra mesma ideia.
 */
export function VistaConfiguracoes({
  turmas,
  estadoCamera,
  salaId,
  alcanceAutomatico,
  conta,
  equipe,
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
        <BotaoAba atual={aba} valor="conta" aoTrocar={setAba}>
          Conta
        </BotaoAba>
        {equipe !== undefined && (
          <BotaoAba atual={aba} valor="equipe" aoTrocar={setAba}>
            Equipe
          </BotaoAba>
        )}
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

      {aba === "conta" && (
        <div role="tabpanel" aria-labelledby="aba-conta">
          <PainelConta conta={conta} />
        </div>
      )}

      {aba === "equipe" && equipe !== undefined && (
        <div role="tabpanel" aria-labelledby="aba-equipe">
          <PainelEquipe equipeInicial={equipe} />
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
