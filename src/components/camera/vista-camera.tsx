"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  IconCamera,
  IconPessoas,
  IconQueda,
  IconRaio,
  IconRelogio,
} from "@/components/ui/icons";
import { StatCard } from "@/components/ui/stat-card";
import type { EstadoCamera } from "@/lib/types";

const INTERVALO_MS = 3000;

/** Limiar do backend para o alerta de dispersao — so' documenta o que ja vem pronto em `alerta_atencao`. */
const LIMIAR_ALERTA_PCT = 20;

/**
 * Tela "Camera": ligar/desligar a captura e acompanhar o estado ao vivo.
 *
 * So' faz polling e mostra numeros ja consolidados pelo backend — a tela
 * nunca pede nem exibe imagem da camera (streaming de video e' proibido
 * pelo escopo do projeto).
 *
 * Estados possiveis (ver EstadoCamera em lib/types.ts):
 * - parada: rodando=false e o professor nao acabou de clicar Ligar;
 * - iniciando: clicou Ligar mas o backend ainda nao confirmou rodando=true
 *   (boot do YOLO + insightface leva alguns segundos) — estado local, o
 *   backend nao distingue isso de "parada" no retorno;
 * - rodando com aula: rodando=true e sessao_id != null;
 * - rodando sem aula: rodando=true e sessao_id == null (fora do horario de
 *   alguma turma cadastrada).
 *
 * O backend nao informa "travou" nem "ja rodava antes de abrir a tela" como
 * estados separados — o polling reconcilia sozinho em qualquer um desses
 * casos, entao nao ha estado extra pra fabricar aqui.
 */
export function VistaCamera() {
  const [estado, setEstado] = useState<EstadoCamera | null>(null);
  const [ligando, setLigando] = useState(false);
  const [desligando, setDesligando] = useState(false);
  const [avisoRede, setAvisoRede] = useState<string | null>(null);
  const [avisoAcao, setAvisoAcao] = useState<string | null>(null);

  // Evita "piscar" de erro de rede num polling que ainda nao rodou nenhuma vez.
  const primeiraLeituraFeita = useRef(false);

  const buscar = useCallback(async () => {
    try {
      const r = await fetch("/api/camera/estado", { cache: "no-store" });
      if (r.ok) {
        setEstado((await r.json()) as EstadoCamera);
        setAvisoRede(null);
        primeiraLeituraFeita.current = true;
      } else {
        const corpo = (await r.json().catch(() => null)) as { erro?: string } | null;
        // So mostra aviso de rede apos' uma leitura bem-sucedida ja' ter acontecido.
        if (primeiraLeituraFeita.current) {
          setAvisoRede(corpo?.erro ?? "Não foi possível falar com a câmera.");
        }
      }
    } catch {
      // Rede fora, notebook desligado, etc — mensagem estavel, tela nao quebra.
      // So mostra se ja' houve uma leitura bem-sucedida antes.
      if (primeiraLeituraFeita.current) {
        setAvisoRede("Não foi possível falar com a câmera. Verifique se o notebook da sala está ligado.");
      }
    }
  }, []);

  useEffect(() => {
    // setTimeout(0) em vez de chamar buscar() direto no corpo do efeito: o
    // lint (react-hooks/set-state-in-effect) trata o setState sincrono aqui
    // como recalculo derivavel do render, mas polling e' assinatura de um
    // sistema externo (o relogio) — o timeout zero deixa isso explicito sem
    // atrasar a primeira leitura na pratica.
    const primeira = setTimeout(buscar, 0);
    const id = setInterval(buscar, INTERVALO_MS);
    return () => {
      clearTimeout(primeira);
      clearInterval(id);
    };
  }, [buscar]);

  // Assim que o polling confirma rodando:true, sai do estado "iniciando".
  useEffect(() => {
    if (!estado?.rodando) return;
    const id = setTimeout(() => setLigando(false), 0);
    return () => clearTimeout(id);
  }, [estado]);

  const ligar = useCallback(async () => {
    setLigando(true);
    setAvisoAcao(null);
    try {
      const r = await fetch("/api/camera/ligar", { method: "POST" });
      if (r.status === 409) {
        // Ja em execucao — nao e' erro, so' segue o polling normalmente.
        setAvisoAcao("A câmera já está em execução.");
      } else if (!r.ok) {
        const corpo = (await r.json().catch(() => null)) as { erro?: string } | null;
        setAvisoAcao(corpo?.erro ?? "Não foi possível ligar a câmera.");
        setLigando(false);
        return;
      }
      // Continua "ligando" ate o proximo polling confirmar rodando:true.
      buscar();
    } catch {
      setAvisoAcao("Não foi possível ligar a câmera. Verifique a conexão com o notebook da sala.");
      setLigando(false);
    }
  }, [buscar]);

  const desligar = useCallback(async () => {
    setDesligando(true);
    setAvisoAcao(null);
    try {
      const r = await fetch("/api/camera/desligar", { method: "POST" });
      if (!r.ok) {
        const corpo = (await r.json().catch(() => null)) as { erro?: string } | null;
        setAvisoAcao(corpo?.erro ?? "Não foi possível desligar a câmera.");
      }
      await buscar();
    } catch {
      setAvisoAcao("Não foi possível desligar a câmera. Verifique a conexão com o notebook da sala.");
    } finally {
      setDesligando(false);
    }
  }, [buscar]);

  // "Iniciando": clicou ligar e o backend ainda nao confirmou rodando:true.
  const iniciando = ligando && !estado?.rodando;

  return (
    <div className="flex flex-col gap-7">
      <div>
        <h1
          className="text-text text-2xl font-extrabold sm:text-3xl"
          style={{ fontFamily: "var(--font-geologica)" }}
        >
          Câmera
        </h1>
        <p className="text-text-body mt-1.5 text-sm">
          Ligue a captura da sala para acompanhar presença e atenção da turma ao vivo.
        </p>
      </div>

      {avisoRede && (
        <div
          className="rounded-xl border px-4 py-3 text-sm font-semibold"
          style={{
            background: "var(--warn-bg)",
            borderColor: "var(--warn)",
            color: "var(--warn-fg)",
          }}
          role="status"
        >
          {avisoRede}
        </div>
      )}

      {estado?.rodando ? (
        <VistaRodando estado={estado} desligando={desligando} aoDesligar={desligar} aviso={avisoAcao} />
      ) : (
        <VistaParada iniciando={iniciando} ligando={ligando} aoLigar={ligar} aviso={avisoAcao} />
      )}
    </div>
  );
}

type VistaParadaProps = {
  iniciando: boolean;
  ligando: boolean;
  aoLigar: () => void;
  aviso: string | null;
};

/** Estados 1 (parada) e 2 (iniciando) — nenhuma captura rodando ainda. */
function VistaParada({ iniciando, ligando, aoLigar, aviso }: VistaParadaProps) {
  return (
    <div
      className="border-border-default bg-surface shadow-card mx-auto flex w-full max-w-md flex-col items-center gap-5 rounded-2xl border p-10 text-center"
    >
      <div
        className="flex h-16 w-16 items-center justify-center rounded-full"
        style={{ background: iniciando ? "var(--warn-bg)" : "var(--surface-2)" }}
        aria-hidden
      >
        <span style={{ color: iniciando ? "var(--warn-fg)" : "var(--text-muted)" }}>
          <IconCamera size={30} />
        </span>
      </div>

      {iniciando ? (
        <>
          <div>
            <h2 className="text-text text-lg font-extrabold">Iniciando…</h2>
            <p className="text-text-muted mt-1 text-sm leading-relaxed">
              Carregando os modelos de reconhecimento. Isso leva alguns segundos.
            </p>
          </div>
          <span
            className="h-1.5 w-40 overflow-hidden rounded-full"
            style={{ background: "var(--surface-2)" }}
            aria-hidden
          >
            <span
              className="block h-full w-1/3 animate-pulse rounded-full"
              style={{ background: "var(--warn)" }}
            />
          </span>
          <span className="sr-only" role="status">
            Iniciando a câmera, aguarde.
          </span>
        </>
      ) : (
        <>
          <div>
            <h2 className="text-text text-lg font-extrabold">Câmera parada</h2>
            <p className="text-text-muted mt-1 text-sm leading-relaxed">
              Nenhuma captura em andamento nesta sala.
            </p>
          </div>
          <button
            type="button"
            onClick={aoLigar}
            disabled={ligando}
            className="rounded-xl px-8 py-3 text-sm font-extrabold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            style={{ background: "var(--primary)" }}
          >
            Ligar
          </button>
        </>
      )}

      {aviso && (
        <p className="text-text-muted text-xs font-semibold" role="status">
          {aviso}
        </p>
      )}
    </div>
  );
}

type VistaRodandoProps = {
  estado: Extract<EstadoCamera, { rodando: true }>;
  desligando: boolean;
  aoDesligar: () => void;
  aviso: string | null;
};

/** Estados 3 (rodando com aula) e 4 (rodando sem aula) — captura ativa. */
function VistaRodando({ estado, desligando, aoDesligar, aviso }: VistaRodandoProps) {
  const temAula = estado.sessao_id !== null && estado.turma !== null;
  // pct_desatento vem como fracao 0-1; * 100 vira porcentagem
  const pctDispersao = Math.round(estado.pct_desatento * 100);

  return (
    <div className="flex flex-col gap-6">
      {/* Cabecalho: selo "ao vivo" + turma + botao Desligar */}
      <div className="border-border-default bg-surface shadow-card flex flex-col gap-4 rounded-2xl border p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="relative flex h-3 w-3" aria-hidden>
            <span
              className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
              style={{ background: "var(--danger)" }}
            />
            <span
              className="relative inline-flex h-3 w-3 rounded-full"
              style={{ background: "var(--danger)" }}
            />
          </span>
          <div>
            <p className="text-text text-sm font-extrabold tracking-wide uppercase">
              Ao vivo{temAula ? ` · ${estado.turma!.nome}` : ""}
            </p>
            <p className="text-text-muted text-xs">
              {temAula
                ? "Câmera rodando com aula em andamento"
                : "Câmera rodando — sem turma neste horário"}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={aoDesligar}
          disabled={desligando}
          className="border-border-default text-text rounded-xl border px-6 py-2.5 text-sm font-extrabold transition-colors hover:bg-[var(--surface-2)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {desligando ? "Desligando…" : "Desligar"}
        </button>
      </div>

      {aviso && (
        <p className="text-text-muted -mt-2 text-xs font-semibold" role="status">
          {aviso}
        </p>
      )}

      {/* Faixa de alerta — precisa saltar aos olhos, cor de perigo cheia. */}
      {estado.alerta_atencao && (
        <div
          className="flex items-center gap-3 rounded-2xl px-5 py-4 text-sm font-extrabold"
          style={{ background: "var(--danger)", color: "#fff" }}
          role="alert"
        >
          <IconQueda size={20} />
          Mais de {LIMIAR_ALERTA_PCT}% da turma dispersa agora
        </div>
      )}

      {/* Numeros ao vivo */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          variante="brand"
          rotulo="Chamada"
          valor={temAula ? `${estado.chamada.presentes}/${estado.chamada.total}` : "—"}
          apoio={temAula ? "Presentes / total da turma" : "Sem aula neste horário"}
          icone={<IconPessoas />}
        />
        <StatCard
          rotulo="Dispersão"
          valor={`${pctDispersao}%`}
          apoio="Turma olhando fora da aula agora"
          icone={
            <span style={{ color: estado.alerta_atencao ? "var(--danger-fg)" : "var(--warn-fg)" }}>
              <IconQueda />
            </span>
          }
        />
        <StatCard
          rotulo="Média de pessoas"
          valor={estado.media_pessoas.toFixed(1)}
          apoio="Detectadas por quadro"
          icone={
            <span style={{ color: "var(--primary)" }}>
              <IconPessoas />
            </span>
          }
        />
        <StatCard
          rotulo="FPS"
          valor={estado.fps !== null ? estado.fps.toFixed(1) : "Sem dado"}
          apoio="Quadros por segundo da captura"
          icone={
            <span style={{ color: "var(--ok-fg)" }}>
              <IconRaio />
            </span>
          }
        />
        <StatCard
          rotulo="MQTT"
          valor={estado.mqtt ? "Conectado" : "Sem conexão"}
          apoio="Envio dos sensores"
          icone={
            <span style={{ color: estado.mqtt ? "var(--ok-fg)" : "var(--danger-fg)" }}>
              <IconRelogio />
            </span>
          }
        />
      </div>
    </div>
  );
}
