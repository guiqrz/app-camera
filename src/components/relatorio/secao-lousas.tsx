"use client";

import { useCallback, useEffect, useState } from "react";

import { IconLousa } from "@/components/ui/icons";
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

  return (
    <div className="border-border-default bg-surface shadow-card flex flex-col gap-4 rounded-2xl border p-5">
      <div className="flex items-center gap-2.5">
        <span aria-hidden style={{ color: "var(--primary)" }}>
          <IconLousa size={20} />
        </span>
        <h2 className="text-text text-lg font-extrabold">
          {lousas.length === 1 ? "Quadro da aula" : "Quadros da aula"}
        </h2>
      </div>

      <ul className="grid gap-4 md:grid-cols-2">
        {lousas.map((lousa, indice) => (
          <li key={lousa.id} className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-text text-xs font-extrabold">
                Captura {indice + 1}
              </span>
              <span className="text-text-muted text-[11px]">
                {horaDoTimestamp(lousa.capturada_em)}
              </span>
            </div>

            {/* eslint-disable-next-line @next/next/no-img-element --
                next/image exigiria configurar o host e otimizaria no servidor;
                aqui a imagem vem da nossa propria ponte e ja' e' pequena. */}
            <img
              src={`/api/lousas/${lousa.sessao_id}/${lousa.id}/imagem`}
              alt={`Foto do quadro, captura ${indice + 1}`}
              className="border-border-default w-full rounded-xl border"
            />

            <TextoDoQuadro lousa={lousa} />
          </li>
        ))}
      </ul>

      {/* Prazo visivel, pelo mesmo motivo da transcricao: os 60 dias sao o
          contrato de privacidade da imagem, nao um detalhe interno. */}
      <p className="text-text-muted text-[11px]">
        As fotos do quadro são apagadas em{" "}
        {formatarDataExtensa(dataDoPrazo(lousas))}.
      </p>
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

  return (
    <p className="text-text bg-surface-soft rounded-xl p-3 text-xs leading-relaxed whitespace-pre-wrap">
      {lousa.texto}
    </p>
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
