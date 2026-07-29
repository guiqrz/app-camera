"use client";

import { useState } from "react";

import { PainelGeral } from "@/components/configuracoes/painel-geral";
import { PainelPrivacidade } from "@/components/configuracoes/painel-privacidade";
import type { EstadoCamera, Turma } from "@/lib/types";

type Aba = "conta" | "geral" | "privacidade";

type VistaConfiguracoesProps = {
  turmas: Turma[];
  estadoCamera: EstadoCamera | null;
  salaId: string | null;
  alcanceAutomatico: { alcancadas: number; total: number } | null;
};

/**
 * Vista interativa da tela "Configuracoes".
 *
 * Tres abas horizontais. "Conta" aparece TRAVADA de proposito em vez de
 * escondida: o CUPCAM nao tem login (a API se autentica por chave, no
 * servidor), e mostrar a aba desativada responde antes a pergunta "onde
 * configuro minha senha?" — esconder faria a pessoa procurar.
 *
 * Segue o mesmo padrao de "em breve" que a sidebar ja usa nos itens nao
 * construidos.
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
        className="mb-5 flex gap-1 overflow-x-auto border-b border-border-default"
        role="tablist"
        aria-label="Seções das configurações"
      >
        {/* Nao e' <button role="tab"> como as outras: um tab desabilitado sai
            da ordem de foco e vira um item que o leitor de tela anuncia sem
            explicar por que nao funciona. Como <span aria-disabled> ele
            continua legivel e obviamente inerte. */}
        <span
          className="-mb-px inline-flex cursor-not-allowed items-center gap-1.5 whitespace-nowrap border-b-2 border-transparent px-3.5 pb-2.5 pt-2 text-sm text-text-muted opacity-55"
          aria-disabled="true"
        >
          <span aria-hidden>🔒</span>
          Conta
          <span className="rounded-full bg-surface-2 px-1.5 py-0.5 text-[0.6rem] font-bold uppercase tracking-wider">
            em breve
          </span>
        </span>

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
      aria-selected={ativo}
      onClick={() => aoTrocar(valor)}
      className={`-mb-px whitespace-nowrap border-b-2 px-3.5 pb-2.5 pt-2 text-sm transition-colors ${
        ativo
          ? "border-primary font-semibold text-primary"
          : "border-transparent text-text-muted hover:text-text-body"
      }`}
    >
      {children}
    </button>
  );
}
