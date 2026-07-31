"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { IconRecomecar, IconTranscricao } from "@/components/ui/icons";
import { dataDoTimestamp, formatarDataExtensa } from "@/lib/format";
import type { Transcricao } from "@/lib/types";

/** Polling so' enquanto transcreve. 10s porque nada muda a cada segundo aqui —
 *  diferente da camera ao vivo, que usa 3s. */
const INTERVALO_MS = 10000;

type SecaoTranscricaoProps = {
  sessaoId: number;
};

/**
 * Transcricao da aula, com os quatro estados possiveis.
 *
 * Por que quatro e nao dois: "sem transcricao" escondia "a aula nao gravou
 * audio", "esta transcrevendo agora" e "falhou". Só o ultimo pede acao do
 * professor, e os outros dois nao sao erro nenhum — mostrar os tres como a
 * mesma coisa fazia o professor procurar problema onde nao havia.
 */
export function SecaoTranscricao({ sessaoId }: SecaoTranscricaoProps) {
  const [transcricao, setTranscricao] = useState<Transcricao | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [aviso, setAviso] = useState<string | null>(null);
  const [reprocessando, setReprocessando] = useState(false);
  const [expandido, setExpandido] = useState(false);
  const [copiado, setCopiado] = useState(false);
  // TEMPORARIO (sai com a retencao de audio): se o WAV ainda esta no disco.
  // Comeca false pra nunca piscar um player que a resposta vai desmentir.
  const [audioDisponivel, setAudioDisponivel] = useState(false);

  // Evita "piscar" aviso de rede antes da primeira leitura ter rodado — mesma
  // guarda de vista-camera.tsx.
  const primeiraLeituraFeita = useRef(false);

  const buscar = useCallback(async () => {
    try {
      const r = await fetch(`/api/transcricao/${sessaoId}`, { cache: "no-store" });
      if (r.status === 404) {
        // Normal: a aula nao gravou audio. Nao e' erro.
        setTranscricao(null);
        setAviso(null);
        primeiraLeituraFeita.current = true;
      } else if (r.ok) {
        setTranscricao((await r.json()) as Transcricao);
        setAviso(null);
        primeiraLeituraFeita.current = true;
      } else if (primeiraLeituraFeita.current) {
        // Ex.: 502 do proxy (backend fora do ar). Sem isto o polling girava
        // "Transcrevendo…" pra sempre com a sala desconectada, sem avisar o
        // professor que a tela parou de fato de atualizar.
        setAviso(
          "Não foi possível atualizar a transcrição. Verifique se o notebook da sala está ligado.",
        );
      }
    } catch {
      // Sem guarda de primeira leitura aqui (diferente de vista-camera): la' o
      // polling roda sempre, e uma falha muda de estado sozinha no proximo
      // tick. Aqui o polling SO' comeca depois que a 1a leitura definir
      // `transcrevendo`, entao se ela falhar nao ha' outro tick pra avisar —
      // silenciar deixaria a tela presa em "sem audio" sem explicar por que.
      setAviso("Não foi possível carregar a transcrição.");
    } finally {
      setCarregando(false);
    }
  }, [sessaoId]);

  // Primeira leitura. setTimeout(0) pelo mesmo motivo da tela de Camera: o lint
  // le o setState sincrono como recalculo derivavel, mas isto e' I/O externo.
  useEffect(() => {
    const id = setTimeout(buscar, 0);
    return () => clearTimeout(id);
  }, [buscar]);

  // TEMPORARIO (sai com a retencao de audio): so' oferece o player quando o WAV
  // realmente esta no disco. `HEAD` em vez de `GET` porque aqui a pergunta e'
  // "existe?" — baixar dezenas de MB pra descobrir isso, em toda visita ao
  // relatorio, gastaria a banda da escola a toa.
  //
  // Passado o prazo de retencao a rota devolve 404, e' o caso NORMAL: o audio
  // cumpriu o ciclo de vida dele. Por isso a falha aqui nao vira aviso na tela,
  // so' esconde o player.
  const pronta = transcricao?.estado === "pronta";
  useEffect(() => {
    if (!pronta) return;
    let cancelado = false;
    (async () => {
      try {
        const r = await fetch(`/api/transcricao/${sessaoId}/audio`, {
          method: "HEAD",
          cache: "no-store",
        });
        if (!cancelado) setAudioDisponivel(r.ok);
      } catch {
        if (!cancelado) setAudioDisponivel(false);
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [pronta, sessaoId]);

  // Polling SO' enquanto transcreve: parado, nao ha o que atualizar, e uma
  // requisicao a cada 10s pra sempre seria desperdicio no relatorio de uma aula
  // que o professor deixou aberta.
  const transcrevendo = transcricao?.estado === "transcrevendo";
  useEffect(() => {
    if (!transcrevendo) return;
    const id = setInterval(buscar, INTERVALO_MS);
    return () => clearInterval(id);
  }, [transcrevendo, buscar]);

  const reprocessar = useCallback(async () => {
    setReprocessando(true);
    setAviso(null);
    try {
      const r = await fetch(`/api/transcricao/${sessaoId}/reprocessar`, {
        method: "POST",
      });
      if (!r.ok) {
        const dados = (await r.json().catch(() => null)) as { erro?: string } | null;
        setAviso(dados?.erro ?? "Não foi possível tentar de novo.");
        return;
      }
      await buscar();
    } catch {
      setAviso("Não foi possível tentar de novo. Verifique a conexão.");
    } finally {
      setReprocessando(false);
    }
  }, [sessaoId, buscar]);

  const copiar = useCallback(async () => {
    if (!transcricao) return;
    try {
      await navigator.clipboard.writeText(transcricao.texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      setAviso("Não foi possível copiar. Selecione o texto e copie manualmente.");
    }
  }, [transcricao]);

  if (carregando) return null;

  return (
    <div className="border-border-default bg-surface shadow-card flex flex-col gap-4 rounded-2xl border p-5">
      <div className="flex items-center gap-2.5">
        <span aria-hidden style={{ color: "var(--primary)" }}>
          <IconTranscricao size={20} />
        </span>
        <h2 className="text-text text-lg font-extrabold">Transcrição da aula</h2>
      </div>

      {aviso && (
        <p className="text-xs font-semibold" style={{ color: "var(--warn-fg)" }} role="status">
          {aviso}
        </p>
      )}

      {transcricao === null ? (
        <p className="text-text-muted text-sm leading-relaxed">
          Esta aula não teve áudio gravado. Para gravar, ligue o microfone na
          tela de Câmera antes ou durante a aula.
        </p>
      ) : transcricao.estado === "transcrevendo" ? (
        <div className="flex items-center gap-3" role="status">
          <span className="relative flex h-3 w-3 shrink-0" aria-hidden>
            <span
              className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
              style={{ background: "var(--warn)" }}
            />
            <span
              className="relative inline-flex h-3 w-3 rounded-full"
              style={{ background: "var(--warn)" }}
            />
          </span>
          <div>
            <p className="text-text text-sm font-extrabold">Transcrevendo o áudio…</p>
            <p className="text-text-muted text-xs">
              Leva alguns minutos. Esta tela atualiza sozinha.
            </p>
          </div>
        </div>
      ) : transcricao.estado === "falhou" ? (
        <div className="flex flex-col gap-3">
          <div>
            <p className="text-sm font-extrabold" style={{ color: "var(--danger-fg)" }}>
              Não foi possível transcrever esta aula
            </p>
            {transcricao.erro && (
              <p className="text-text-muted mt-1 text-xs leading-relaxed">
                {transcricao.erro}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={reprocessar}
            disabled={reprocessando}
            className="border-border-default text-text flex w-fit items-center gap-2 rounded-xl border px-4 py-2 text-sm font-extrabold transition-colors hover:bg-[var(--surface-2)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <IconRecomecar size={16} />
            {reprocessando ? "Tentando…" : "Tentar de novo"}
          </button>
          {/* Player so' aqui e no sucesso-com-audio-guardado: e' justamente
              quando o WAV ainda existe no disco. */}
          <audio controls preload="none" className="w-full max-w-md">
            <source src={`/api/transcricao/${sessaoId}/audio`} type="audio/wav" />
          </audio>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="text-text-muted flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
            {transcricao.duracao_seg !== null && (
              <span>
                {/* Piso de "menos de 1 min": Math.round sozinho mostrava
                    "0 min de audio" pra aula com menos de 30s gravados. */}
                {transcricao.duracao_seg < 60
                  ? "menos de 1 min de áudio"
                  : `${Math.round(transcricao.duracao_seg / 60)} min de áudio`}
              </span>
            )}
            <span>modelo: {transcricao.modelo}</span>
            {/* Expira visivel de proposito: e' o contrato de privacidade dos 60
                dias. Data extensa (com ano) e nao "DD/MM": um prazo de 60 dias
                pode cair no ano seguinte, e "12/09" sem ano e' ambiguo bem no
                dado que E' o contrato de privacidade. */}
            <span>
              expira em {formatarDataExtensa(dataDoTimestamp(transcricao.expira_em))}
            </span>
          </div>

          {/* Player da aula transcrita. TEMPORARIO: existe enquanto o backend
              guarda o WAV por alguns dias (RETENCAO_AUDIO_DIAS) pro professor
              conferir a transcricao contra a fala. Sai junto com a retencao na
              versao definitiva, quando o audio voltar a ser apagado assim que a
              transcricao sai.

              So' renderiza depois que uma requisicao confirma que o audio esta
              la': passado o prazo, a rota devolve 404 e um <audio> apontando pra
              ela apareceria como player quebrado, sugerindo defeito onde o que
              houve foi a regra de privacidade funcionando.

              `preload="none"` porque o WAV tem dezenas de MB e a maioria das
              visitas ao relatorio nao vai ouvir nada. */}
          {audioDisponivel && (
            <div className="flex flex-col gap-1.5">
              <audio
                controls
                preload="none"
                src={`/api/transcricao/${sessaoId}/audio`}
                className="w-full max-w-md"
              >
                Seu navegador não reproduz áudio.{" "}
                <a href={`/api/transcricao/${sessaoId}/audio`}>
                  Baixar o áudio da aula
                </a>
              </audio>
              <p className="text-text-muted text-xs">
                O áudio fica disponível por alguns dias para você conferir a
                transcrição. Depois disso, só o texto permanece.
              </p>
            </div>
          )}

          <div
            className="text-text-body overflow-y-auto text-sm leading-relaxed"
            style={{ maxHeight: expandido ? "none" : "16rem" }}
          >
            {transcricao.texto}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setExpandido((v) => !v)}
              className="border-border-default text-text rounded-xl border px-4 py-2 text-xs font-extrabold transition-colors hover:bg-[var(--surface-2)]"
            >
              {expandido ? "Recolher" : "Expandir"}
            </button>
            <button
              type="button"
              onClick={copiar}
              className="border-border-default text-text rounded-xl border px-4 py-2 text-xs font-extrabold transition-colors hover:bg-[var(--surface-2)]"
            >
              {copiado ? "Copiado!" : "Copiar texto"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
