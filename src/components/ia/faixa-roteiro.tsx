"use client";

import { useCallback, useState } from "react";

import { IconBaixar, IconIA } from "@/components/ui/icons";
import { baixarBlob, nomeDoArquivoDoCabecalho } from "@/lib/baixar-arquivo";
import { urlDoArquivoDoRoteiro, type FormatoDoPlano } from "@/lib/plano-de-aula";

const DOWNLOADS: { formato: FormatoDoPlano; rotulo: string }[] = [
  { formato: "docx", rotulo: "Baixar roteiro (Word)" },
  { formato: "pdf", rotulo: "Baixar roteiro (PDF)" },
];

const SEM_ETAPAS = "Este plano não tem etapas para virar roteiro.";

/**
 * `confirmando` existe porque gerar de novo SUBSTITUI o roteiro anterior (um
 * por plano): o professor confirma dentro do cartao, nunca num confirm() do
 * navegador.
 */
type Estado =
  | { tipo: "sem_roteiro" }
  | { tipo: "gerando"; anterior: "sem_roteiro" | "pronto" }
  | { tipo: "pronto" }
  | { tipo: "confirmando" };

type FaixaRoteiroProps = {
  planoId: number;
  temEtapas: boolean;
  geradoEm: string | null;
};

/**
 * "Roteiro da aula" no cartao do plano (01/10/2026): o roteiro pra o
 * professor estudar antes da aula, gerado sob demanda a partir deste plano.
 *
 * Nao busca o roteiro pra mostrar: ele e' material de leitura longa, e o
 * lugar dele e' o Word/PDF. A faixa so' precisa saber SE existe
 * (`geradoEm`, que vem no proprio plano) pra mostrar o botao certo.
 */
export function FaixaRoteiro({ planoId, temEtapas, geradoEm }: FaixaRoteiroProps) {
  const [estado, setEstado] = useState<Estado>(
    geradoEm !== null ? { tipo: "pronto" } : { tipo: "sem_roteiro" },
  );
  const [aviso, setAviso] = useState<string | null>(null);
  const [gerandoArquivo, setGerandoArquivo] = useState<FormatoDoPlano | null>(null);
  const [anuncio, setAnuncio] = useState("");

  const gerar = useCallback(async () => {
    const anterior = estado.tipo === "sem_roteiro" ? "sem_roteiro" : "pronto";
    setEstado({ tipo: "gerando", anterior });
    setAviso(null);
    setAnuncio("Gerando o roteiro…");
    try {
      const resposta = await fetch(`/api/ia/planos/${planoId}/roteiro`, { method: "POST" });
      const corpo = (await resposta.json().catch(() => null)) as {
        erro?: string;
        motivo?: string;
      } | null;
      if (resposta.status === 409) {
        throw new Error(SEM_ETAPAS);
      }
      if (!resposta.ok) {
        throw new Error(corpo?.erro ?? "Não foi possível gerar o roteiro. Tente de novo.");
      }
      setEstado({ tipo: "pronto" });
      setAnuncio("Roteiro gerado.");
    } catch (erro) {
      // Volta pro estado de antes: se ja' havia roteiro, ele continua valendo
      // (o backend so' substitui depois de validar o novo).
      setEstado({ tipo: anterior });
      setAnuncio("");
      setAviso(
        erro instanceof Error ? erro.message : "Não foi possível gerar o roteiro. Tente de novo.",
      );
    }
  }, [estado.tipo, planoId]);

  const baixar = useCallback(
    async (formato: FormatoDoPlano) => {
      setGerandoArquivo(formato);
      setAviso(null);
      try {
        const resposta = await fetch(urlDoArquivoDoRoteiro(planoId, formato));
        if (!resposta.ok) {
          const corpo = (await resposta.json().catch(() => null)) as { erro?: string } | null;
          throw new Error(corpo?.erro ?? "Não foi possível gerar o arquivo. Tente de novo.");
        }
        const blob = await resposta.blob();
        baixarBlob(
          blob,
          nomeDoArquivoDoCabecalho(resposta.headers.get("content-disposition"), `roteiro.${formato}`),
        );
      } catch (erro) {
        setAviso(
          erro instanceof Error ? erro.message : "Não foi possível gerar o arquivo. Tente de novo.",
        );
      } finally {
        setGerandoArquivo(null);
      }
    },
    [planoId],
  );

  const gerando = estado.tipo === "gerando";

  return (
    <div className="border-border-default mt-4 border-t pt-3" aria-busy={gerando}>
      <h4 className="text-text text-[11px] font-semibold tracking-wide uppercase">
        Roteiro da aula
      </h4>
      <p className="text-text-muted mt-0.5 text-[11px] leading-relaxed">
        Pra você estudar antes da aula: falas, perguntas, dúvidas prováveis e exemplos, bloco a
        bloco.
      </p>

      <div className="mt-2.5 flex flex-wrap gap-2">
        {(estado.tipo === "sem_roteiro" || (gerando && estado.anterior === "sem_roteiro")) && (
          <button
            type="button"
            onClick={() => void gerar()}
            disabled={!temEtapas || gerando}
            className="btn-acao justify-center"
          >
            <span aria-hidden>
              <IconIA size={13} />
            </span>
            {gerando ? "Gerando roteiro… pode levar até 1 minuto" : "Gerar roteiro"}
          </button>
        )}

        {(estado.tipo === "pronto" ||
          estado.tipo === "confirmando" ||
          (gerando && estado.anterior === "pronto")) && (
          <>
            {DOWNLOADS.map(({ formato, rotulo }) => (
              <button
                key={formato}
                type="button"
                onClick={() => void baixar(formato)}
                disabled={gerandoArquivo !== null || gerando}
                className="btn-acao justify-center"
              >
                <span aria-hidden>
                  <IconBaixar size={13} />
                </span>
                {gerandoArquivo === formato ? "Gerando…" : rotulo}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setEstado({ tipo: "confirmando" })}
              disabled={gerando || estado.tipo === "confirmando" || gerandoArquivo !== null}
              className="btn-acao justify-center"
            >
              <span aria-hidden>
                <IconIA size={13} />
              </span>
              {gerando ? "Gerando roteiro… pode levar até 1 minuto" : "Gerar de novo"}
            </button>
          </>
        )}
      </div>

      {!temEtapas && estado.tipo === "sem_roteiro" && (
        <p className="text-text-muted mt-2 text-[11px]">{SEM_ETAPAS}</p>
      )}

      {estado.tipo === "confirmando" && (
        <div
          className="border-border-default mt-3 rounded-lg border p-3"
          style={{ background: "var(--surface-2)" }}
        >
          <p className="text-text text-xs font-semibold">O roteiro atual será substituído.</p>
          <div className="mt-2.5 flex flex-wrap gap-2">
            <button type="button" onClick={() => void gerar()} className="btn-acao justify-center">
              Substituir
            </button>
            <button
              type="button"
              onClick={() => setEstado({ tipo: "pronto" })}
              className="btn-acao justify-center"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      <p className="sr-only" aria-live="polite">
        {gerandoArquivo !== null ? "Gerando o arquivo…" : anuncio}
      </p>

      {aviso !== null && (
        <p
          className="mt-2 text-[11px] font-semibold"
          style={{ color: "var(--danger-fg)" }}
          role="alert"
        >
          {aviso}
        </p>
      )}
    </div>
  );
}
