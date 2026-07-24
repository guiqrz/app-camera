"use client";

import { useCallback, useEffect, useState } from "react";

import { IconPessoas, IconQueda } from "@/components/ui/icons";
import { StatCard } from "@/components/ui/stat-card";
import type { EstadoCamera } from "@/lib/types";

const INTERVALO_MS = 3000;

/** Limiar do backend para o alerta de dispersao — so' documenta o que ja vem pronto em `alerta_atencao`. */
const LIMIAR_ALERTA_PCT = 20;

/**
 * Card "Aula acontecendo agora" no topo de Relatorios.
 *
 * Escopo minimo decidido conscientemente: consome SO' `/api/camera/estado`
 * (polling), sem proxy novo e sem buscar o relatorio da sessao aberta. Por
 * isso nao reusa `grafico-linha-tempo` nem `painel-presenca` — esses exigem
 * dado que so' a rota de relatorio da sessao tem, e este card nao busca essa
 * rota. Mostra apenas os numeros que o estado da camera ja devolve.
 *
 * Auto-oculta (retorna null) quando nao ha aula em curso, entao nao altera o
 * layout normal de Relatorios fora desse caso.
 */
export function CardAoVivo() {
  const [estado, setEstado] = useState<EstadoCamera | null>(null);

  const buscar = useCallback(async () => {
    try {
      const r = await fetch("/api/camera/estado", { cache: "no-store" });
      if (r.ok) {
        setEstado((await r.json()) as EstadoCamera);
      }
      // Erro de rede/resposta nao-ok: mantem o ultimo estado conhecido: o
      // card nao deve piscar nem quebrar a tela de Relatorios por causa de
      // uma falha passageira do polling.
    } catch {
      // Notebook da sala desligado, rede fora, etc — silencioso de proposito.
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

  if (!estado?.rodando || estado.sessao_id === null || estado.turma === null) {
    return null;
  }

  // pct_desatento vem como fracao 0-1; * 100 vira porcentagem
  const pctDispersao = Math.round(estado.pct_desatento * 100);

  return (
    <div className="border-border-default bg-surface shadow-card flex flex-col gap-5 rounded-2xl border p-5 sm:p-6">
      {/* Selo "AO VIVO" pulsando + nome da turma — mesmo padrao visual da tela /camera. */}
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
            Ao vivo · {estado.turma.nome}
          </p>
          <p className="text-text-muted text-xs">Aula acontecendo agora</p>
        </div>
      </div>

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

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard
          variante="brand"
          rotulo="Chamada"
          valor={`${estado.chamada.presentes}/${estado.chamada.total}`}
          apoio="Presentes / total da turma"
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
      </div>

      <p className="text-text-muted text-xs">
        Insights completos quando a aula terminar.
      </p>
    </div>
  );
}
