"use client";

import { useEffect, useState } from "react";

import {
  Aviso,
  Linha,
  Linhas,
  Recado,
  Secao,
} from "@/components/configuracoes/secao";
import { IconIA } from "@/components/ui/icons";
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
      <Linhas>
        <Linha
          rotulo="Modelo"
          apoio={escolhido?.descricao ?? "Carregando as opções…"}
          icone={<IconIA size={15} />}
        >
          <select
            className="cfg-select"
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
      </Linhas>

      {(erro !== null || salvo || salvando) &&
        (erro !== null ? (
          <Recado tom="erro">{erro}</Recado>
        ) : (
          <Recado>{salvando ? "Salvando…" : "Modelo salvo."}</Recado>
        ))}

      {/* Sem chave o assistente responde 503 em toda pergunta. O passo a passo
          fica aqui porque quem resolve isso e' quem administra o notebook da
          sala — nao ha o que o professor clique pra corrigir. */}
      {configuracao !== null && !configuracao.chave_configurada && (
        <Aviso>
          <strong>O assistente ainda não está configurado.</strong> Falta a
          chave de API no servidor. No notebook da sala, coloque{" "}
          <code>GEMINI_API_KEY</code> no arquivo <code>.env</code> do CUPCAM e
          reinicie a API. Até lá, as perguntas não são respondidas.
        </Aviso>
      )}
    </Secao>
  );
}
