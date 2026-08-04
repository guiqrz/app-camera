"use client";

import { useCallback, useEffect, useState } from "react";

import { DicaAjuda } from "@/components/ui/dica-ajuda";
import { IconLousa, IconRecomecar } from "@/components/ui/icons";
import { horaDoTimestamp } from "@/lib/format";
import type { Lousa } from "@/lib/types";

type PainelLousaProps = {
  /**
   * Sessao da aula em curso, ou null quando a camera subiu sem turma agendada.
   * Sem sessao nao ha aula onde guardar o quadro — a captura fica indisponivel
   * em vez de gravar solto.
   */
  sessaoId: number | null;
  /** Desliga o botao (camera fora do ar, ou troca de modo em curso). */
  desabilitado?: boolean;
};

/** Quanto tempo esperar antes de buscar a lousa nova depois de pedir a captura.
 *
 *  A camera le o pedido uma vez por ciclo (~1s), entao buscar na hora traria a
 *  lista sem a foto nova e o professor veria "nada aconteceu". 1,6s da folga
 *  pro ciclo virar sem deixar a espera longa. */
const ESPERA_ATE_A_FOTO_MS = 1600;

/**
 * Captura do quadro e lista dos quadros ja guardados, no modo Lousa.
 *
 * So' aparece quando a camera esta NO modo Lousa: guardar imagem e' excecao
 * autorizada apenas nesse modo (ver CLAUDE.md do backend, secao Privacidade), e
 * um botao visivel fora dele prometeria algo que a API recusa com 409.
 *
 * A leitura pelo Gemini acontece dentro do GET das lousas, no backend — por
 * isso a busca pode demorar alguns segundos na primeira vez depois de uma
 * captura. O estado de cada lousa ('lendo'/'pronta'/'falhou') e' o que a tela
 * usa pra dizer em que pe esta, em vez de mostrar um texto vazio que nao
 * distingue "processando" de "quadro em branco".
 */
export function PainelLousa({ sessaoId, desabilitado = false }: PainelLousaProps) {
  const [lousas, setLousas] = useState<Lousa[]>([]);
  const [capturando, setCapturando] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const buscar = useCallback(async () => {
    if (sessaoId === null) return;
    setCarregando(true);
    try {
      const resposta = await fetch(`/api/lousas/${sessaoId}`, { cache: "no-store" });
      if (!resposta.ok) throw new Error("falha ao listar");
      const dados = (await resposta.json()) as { lousas: Lousa[] };
      setLousas(dados.lousas);
      setErro(null);
    } catch {
      setErro("Não foi possível carregar os quadros desta aula.");
    } finally {
      setCarregando(false);
    }
  }, [sessaoId]);

  // Busca uma vez ao entrar no modo: a aula pode ja' ter quadros guardados de
  // antes (o professor entrou na Lousa, saiu e voltou).
  useEffect(() => {
    void buscar();
  }, [buscar]);

  async function capturar() {
    setCapturando(true);
    setErro(null);
    try {
      const resposta = await fetch("/api/camera/lousa/capturar", { method: "POST" });
      if (!resposta.ok) {
        const corpo = (await resposta.json().catch(() => null)) as
          | { erro?: string }
          | null;
        setErro(corpo?.erro ?? "Não foi possível capturar o quadro.");
        return;
      }
      // A foto ainda nao existe: a camera le o pedido no proximo ciclo.
      await new Promise((resolver) => setTimeout(resolver, ESPERA_ATE_A_FOTO_MS));
      await buscar();
    } catch {
      setErro("Não foi possível falar com a câmera.");
    } finally {
      setCapturando(false);
    }
  }

  const jaCapturou = lousas.length > 0;

  return (
    <div className="border-border-default bg-surface shadow-card flex flex-col gap-3 rounded-2xl border p-5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-text-muted text-xs font-bold tracking-wide uppercase">
          Quadro da aula
        </span>
        <DicaAjuda
          texto={
            "Guarda uma foto do que você escreveu no quadro e lê o texto dela. " +
            "A foto fica junto desta aula e é apagada depois de 60 dias. " +
            "O engajamento já registrado da aula não é afetado."
          }
          rotulo="O que a captura do quadro faz"
          lado="esquerda"
        />
      </div>

      {sessaoId === null ? (
        <p className="text-text-muted text-xs leading-relaxed">
          A câmera está sem turma nesta sessão, então não há aula onde guardar o
          quadro. Inicie a câmera com uma turma para usar a captura.
        </p>
      ) : (
        <>
          <button
            type="button"
            onClick={capturar}
            disabled={desabilitado || capturando}
            className="focus-visible:ring-primary flex items-center justify-center gap-2.5 rounded-xl border px-4 py-3 transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60"
            style={{
              borderColor: "var(--primary)",
              background: "var(--primary)",
              color: "#fff",
            }}
          >
            <span aria-hidden>
              {jaCapturou ? <IconRecomecar size={18} /> : <IconLousa size={18} />}
            </span>
            <span className="text-sm font-extrabold">
              {capturando
                ? "Capturando…"
                : jaCapturou
                  ? "Capturar de novo"
                  : "Capturar quadro"}
            </span>
          </button>

          {erro && (
            <p
              role="alert"
              className="rounded-xl px-3 py-2 text-xs leading-relaxed font-semibold"
              style={{ background: "var(--danger-bg)", color: "var(--danger-fg)" }}
            >
              {erro}
            </p>
          )}

          {!jaCapturou && !carregando && !erro && (
            <p className="text-text-muted text-xs leading-relaxed">
              Nenhum quadro guardado nesta aula ainda.
            </p>
          )}

          {lousas.length > 0 && (
            <ul className="flex flex-col gap-3">
              {lousas.map((lousa, indice) => (
                <li
                  key={lousa.id}
                  className="border-border-default flex flex-col gap-2 rounded-xl border p-3"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-text text-xs font-extrabold">
                      Captura {indice + 1}
                    </span>
                    <span className="text-text-muted text-[11px]">
                      {horaDoTimestamp(lousa.capturada_em)}
                    </span>
                  </div>

                  {/* eslint-disable-next-line @next/next/no-img-element --
                      next/image exigiria configurar o host e otimiza no
                      servidor; aqui a imagem vem da nossa propria ponte, ja'
                      pequena, e uma so' por captura. */}
                  <img
                    src={`/api/lousas/${lousa.sessao_id}/${lousa.id}/imagem`}
                    alt={`Foto do quadro, captura ${indice + 1}`}
                    className="border-border-default w-full rounded-lg border"
                  />

                  <TextoDaLousa lousa={lousa} />
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

/**
 * O texto lido, ou o estado quando ele ainda nao existe.
 *
 * Separado porque sao tres casos com tratamento diferente, e um `? :`
 * encadeado no meio do JSX esconderia justamente a distincao que importa.
 */
function TextoDaLousa({ lousa }: { lousa: Lousa }) {
  if (lousa.estado === "lendo") {
    return (
      <p className="text-text-muted text-xs" role="status">
        Lendo o quadro…
      </p>
    );
  }

  if (lousa.estado === "falhou") {
    return (
      <p
        className="text-xs leading-relaxed font-semibold"
        style={{ color: "var(--danger-fg)" }}
      >
        Não foi possível ler este quadro
        {lousa.erro ? `: ${lousa.erro}` : "."}
      </p>
    );
  }

  return (
    <p className="text-text text-xs leading-relaxed whitespace-pre-wrap">
      {lousa.texto}
    </p>
  );
}
