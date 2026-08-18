"use client";

import { useCallback, useEffect, useState } from "react";

import { IconInfo } from "@/components/ui/icons";
import { dataDoTimestamp, formatarDataExtensa, horaDoTimestamp } from "@/lib/format";
import type { Lousa } from "@/lib/types";

/** Polling so' enquanto ha quadro sendo lido. 4s: a leitura roda em segundo
 *  plano no backend e leva segundos, nao minutos como a transcricao de uma
 *  aula inteira. */
const INTERVALO_MS = 4000;

type SecaoLousasProps = {
  sessaoId: number;
};

/**
 * Quadros guardados na aula, com o texto lido de cada um.
 *
 * So' aparece quando a aula TEM quadro guardado: uma secao vazia em toda aula
 * comum sugeriria que o professor esqueceu de fazer algo, quando na verdade o
 * modo Lousa e' opcional e a maioria das aulas nao usa.
 *
 * Os tres estados sao tratados separadamente pelo mesmo motivo da transcricao:
 * texto vazio nao distingue "ainda lendo", "o quadro estava em branco" e
 * "falhou" — e so' o ultimo pede acao do professor.
 */
export function SecaoLousas({ sessaoId }: SecaoLousasProps) {
  const [lousas, setLousas] = useState<Lousa[]>([]);
  const [carregando, setCarregando] = useState(true);

  const buscar = useCallback(async () => {
    try {
      const resposta = await fetch(`/api/lousas/${sessaoId}`, { cache: "no-store" });
      if (!resposta.ok) return;
      const dados = (await resposta.json()) as { lousas: Lousa[] };
      setLousas(dados.lousas);
    } catch {
      // Silencioso de proposito: esta secao e' complementar ao relatorio, e um
      // erro de rede aqui nao pode roubar a atencao de quem veio ver presenca
      // e atencao. Sem quadro carregado, a secao simplesmente nao aparece.
    } finally {
      setCarregando(false);
    }
  }, [sessaoId]);

  useEffect(() => {
    void buscar();
  }, [buscar]);

  // Enquanto algum quadro estiver sendo lido, reconsulta: a leitura acontece
  // no backend e termina sem avisar a tela.
  const lendoAlgum = lousas.some((lousa) => lousa.estado === "lendo");
  useEffect(() => {
    if (!lendoAlgum) return;
    const timer = setInterval(() => void buscar(), INTERVALO_MS);
    return () => clearInterval(timer);
  }, [lendoAlgum, buscar]);

  if (carregando || lousas.length === 0) return null;

  // SEM card nem título próprios: quem desenha os dois é o `BlocoColapsavel`
  // em volta. A seção antiga trazia a própria `<section>` com "Quadros da
  // aula", o que empilhava dois cards e dois títulos.
  return (
    <div className="flex flex-col gap-4">
      <p className="text-text-muted m-0 flex items-start gap-[7px] text-[11.5px] leading-[1.45]">
        <span className="mt-px flex-none opacity-70" aria-hidden>
          <IconInfo size={13} />
        </span>
        Texto lido do quadro pela Cupcam. O que ela não conseguiu ler aparece
        marcado.
      </p>

      {lousas.map((lousa, indice) => (
        <ParDaLousa key={lousa.id} lousa={lousa} indice={indice} />
      ))}

      {/* Prazo visivel, pelo mesmo motivo da transcricao: os 60 dias sao o
          contrato de privacidade da imagem, nao um detalhe interno. */}
      <p className="text-text-muted text-[11px]">
        As fotos do quadro são apagadas em{" "}
        {formatarDataExtensa(dataDoPrazo(lousas))}.
      </p>
    </div>
  );
}

/**
 * Uma captura: FOTO e TEXTO lado a lado (`.lousa-par`, 5fr/7fr).
 *
 * A foto é a FONTE do texto, então divide o espaço com ele em vez de ficar
 * escondida embaixo. A imagem precisa de largura pra ser legível; o texto
 * precisa de mais — daí a proporção. Empilha em 1 coluna abaixo de 900px.
 */
function ParDaLousa({ lousa, indice }: { lousa: Lousa; indice: number }) {
  return (
    <div className="grid items-start gap-[15px] min-[900px]:grid-cols-[5fr_7fr]">
      <figure className="m-0 flex flex-col gap-[7px]">
        {/* eslint-disable-next-line @next/next/no-img-element --
            next/image exigiria configurar o host e otimizaria no servidor;
            aqui a imagem vem da nossa propria ponte e ja' e' pequena. */}
        <img
          src={`/api/lousas/${lousa.sessao_id}/${lousa.id}/imagem`}
          alt={`Foto do quadro, captura ${indice + 1}`}
          className="border-border-default w-full rounded-[9px] border"
        />
        <figcaption className="text-text-muted text-[11px]">
          Registrada automaticamente durante o modo Lousa ·{" "}
          {horaDoTimestamp(lousa.capturada_em)}
        </figcaption>
      </figure>

      <div>
        <p
          className="text-text-muted mb-[5px] text-[10.5px] font-semibold uppercase"
          style={{ letterSpacing: "0.06em" }}
        >
          Transcrição da lousa
        </p>
        <TextoDoQuadro lousa={lousa} />
      </div>
    </div>
  );
}

/** O texto lido, ou o estado quando ele ainda nao existe. */
function TextoDoQuadro({ lousa }: { lousa: Lousa }) {
  if (lousa.estado === "lendo") {
    return (
      <p className="text-text-muted text-xs" role="status">
        Lendo o quadro… Esta tela atualiza sozinha.
      </p>
    );
  }

  if (lousa.estado === "falhou") {
    return (
      <p className="text-xs leading-relaxed font-semibold" style={{ color: "var(--danger-fg)" }}>
        Não foi possível ler este quadro{lousa.erro ? `: ${lousa.erro}` : "."}
      </p>
    );
  }

  // `max-height` + rolagem: um quadro cheio de conteúdo esticaria o card e
  // empurraria a tela inteira pra baixo. `whitespace-pre-wrap` preserva as
  // quebras que o modelo usou pra reproduzir o layout do quadro.
  return (
    <div
      className="border-border-default text-text-body max-h-[300px] overflow-y-auto rounded-[9px] border px-[15px] py-[13px] text-[12.5px] leading-[1.55] whitespace-pre-wrap"
      style={{ background: "var(--surface-2)" }}
    >
      {lousa.texto}
    </div>
  );
}

/** A expiracao mais proxima entre as capturas. Uma data so' na tela, e a que
 *  vence primeiro — dizer a mais distante prometeria mais tempo do que ha.
 *
 *  Ordena por texto de proposito: "AAAA-MM-DD HH:MM:SS" ordena igual
 *  cronologicamente, entao nao ha por que construir Date so' pra comparar. */
function dataDoPrazo(lousas: Lousa[]) {
  const maisProxima = [...lousas].map((lousa) => lousa.expira_em).sort()[0];
  return dataDoTimestamp(maisProxima);
}
