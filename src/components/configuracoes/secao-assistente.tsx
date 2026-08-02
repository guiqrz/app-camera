"use client";

import { useEffect, useState } from "react";

import { Linha, Secao } from "@/components/configuracoes/secao";
import type { ConfiguracaoIA } from "@/lib/types";

/**
 * Configuracao do Cup AI: qual modelo responde, e os avisos que vem junto.
 *
 * Le do servidor porque o modelo e' do CUPCAM, nao do navegador — diferente do
 * tema e da turma padrao, que vivem no localStorage. Trocar aqui vale pra
 * proxima pergunta, sem reiniciar a API.
 */
export function SecaoAssistente() {
  const [configuracao, setConfiguracao] = useState<ConfiguracaoIA | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);

  // setTimeout(0) em vez de chamar no corpo do efeito: mesmo motivo do
  // painel-geral.tsx — o lint le o setState sincrono como estado derivavel do
  // render, mas isto e' conversa com um sistema externo.
  useEffect(() => {
    const id = setTimeout(() => {
      void (async () => {
        try {
          const r = await fetch("/api/ia/config", { cache: "no-store" });
          if (!r.ok) throw new Error("falha");
          setConfiguracao((await r.json()) as ConfiguracaoIA);
        } catch {
          setErro(
            "Não foi possível carregar a configuração do assistente. Verifique se o notebook da sala está ligado.",
          );
        } finally {
          setCarregando(false);
        }
      })();
    }, 0);
    return () => clearTimeout(id);
  }, []);

  const trocarModelo = async (modelo: string) => {
    if (configuracao === null) return;

    const anterior = configuracao.modelo;
    // Troca na tela primeiro pro <select> responder na hora; volta atras se a
    // API recusar, em vez de deixar a tela afirmando algo que nao foi gravado.
    setConfiguracao({ ...configuracao, modelo });
    setSalvando(true);
    setErro(null);
    setSalvo(false);

    try {
      const r = await fetch("/api/ia/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modelo }),
      });

      if (!r.ok) {
        const dados = (await r.json().catch(() => null)) as { erro?: string } | null;
        setConfiguracao((atual) =>
          atual === null ? atual : { ...atual, modelo: anterior },
        );
        setErro(dados?.erro ?? "Não foi possível trocar o modelo.");
        return;
      }

      setSalvo(true);
    } catch {
      setConfiguracao((atual) =>
        atual === null ? atual : { ...atual, modelo: anterior },
      );
      setErro("Não foi possível trocar o modelo. Verifique a conexão.");
    } finally {
      setSalvando(false);
    }
  };

  const escolhido = configuracao?.modelos.find(
    (modelo) => modelo.id === configuracao.modelo,
  );

  return (
    <Secao
      titulo="Assistente"
      descricao="Qual modelo responde no Cup AI. Vale já na próxima pergunta."
    >
      <Linha
        rotulo="Modelo"
        apoio={escolhido?.descricao ?? "Carregando as opções…"}
      >
        <select
          className="rounded-sm border border-border-default bg-surface px-2.5 py-1.5 text-sm text-text disabled:opacity-50"
          value={configuracao?.modelo ?? ""}
          onChange={(evento) => void trocarModelo(evento.target.value)}
          disabled={carregando || salvando || configuracao === null}
          aria-label="Modelo do assistente"
        >
          {configuracao === null ? (
            <option value="">—</option>
          ) : (
            configuracao.modelos.map((modelo) => (
              <option key={modelo.id} value={modelo.id}>
                {modelo.rotulo}
              </option>
            ))
          )}
        </select>
      </Linha>

      {(erro !== null || salvo || salvando) && (
        <div className="py-3">
          {erro !== null ? (
            <p className="m-0 text-xs font-semibold text-danger" role="alert">
              {erro}
            </p>
          ) : (
            <p className="m-0 text-xs text-text-muted" role="status">
              {salvando ? "Salvando…" : "Modelo salvo."}
            </p>
          )}
        </div>
      )}

      {/* Sem chave o assistente responde 503 em toda pergunta. O passo a passo
          fica aqui porque quem resolve isso e' quem administra o notebook da
          sala — nao ha o que o professor clique pra corrigir. */}
      {configuracao !== null && !configuracao.chave_configurada && (
        <div className="my-3 flex gap-2.5 rounded-sm bg-warn-bg px-3.5 py-3 text-xs leading-relaxed text-text-body">
          <span aria-hidden>⚠</span>
          <span>
            <strong className="text-warn">
              O assistente ainda não está configurado.
            </strong>{" "}
            Falta a chave de API no servidor. No notebook da sala, coloque{" "}
            <code className="rounded bg-surface-2 px-1 py-0.5 font-mono">
              GEMINI_API_KEY
            </code>{" "}
            no arquivo{" "}
            <code className="rounded bg-surface-2 px-1 py-0.5 font-mono">
              .env
            </code>{" "}
            do CUPCAM e reinicie a API. Até lá, as perguntas não são respondidas.
          </span>
        </div>
      )}

    </Secao>
  );
}
