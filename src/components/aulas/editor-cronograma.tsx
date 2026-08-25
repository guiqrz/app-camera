"use client";

import { useState } from "react";

import { IconAlerta, IconCalendario, IconCheck } from "@/components/ui/icons";
import { dataDoTimestamp, formatarDataCurta } from "@/lib/format";
import type { CronogramaSalvo, PreviaDoCronograma } from "@/lib/types";

/**
 * Feature F9 — o cronograma do bimestre.
 *
 * O QUE O APP FAZ QUE O PROFESSOR NAO CONSEGUE
 * --------------------------------------------
 * Ele sabe quantas aulas DE VERDADE existem entre hoje e o fim do bimestre.
 *
 * O professor planeja "14 aulas" no papel e descobre em novembro que tinha 11,
 * porque teve feriado, jogo, conselho e semana de prova. O app ja' tem a grade
 * e o calendario — e por isso o aviso `cabe: false` e' a feature inteira, nao
 * um detalhe da tela.
 *
 * NAO ADICIONA TRABALHO
 * ---------------------
 * Ele ja' faz esse planejamento hoje, no papel ou no Word, e a escola entrega a
 * lista de conteudos pronta (e' o curriculo). A diferenca e' que aqui o plano
 * conversa com a realidade — e vira a base da F10, F11 e F12.
 *
 * POR QUE A PREVIA E' SEPARADA DA GRAVACAO
 * ----------------------------------------
 * O professor precisa VER que os 14 conteudos nao cabem antes de salvar, e
 * ainda em fevereiro. Gravar primeiro e avisar depois inverteria o unico
 * momento em que o aviso muda alguma coisa.
 */

/** Um conteudo por linha — o formato em que a escola entrega o currículo. */
function separarLinhas(texto: string): string[] {
  return texto
    .split("\n")
    .map((linha) => linha.trim())
    .filter(Boolean);
}

const ESTILO_CARTAO = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  boxShadow: "var(--shadow-card)",
} as const;

const ESTILO_CAMPO = {
  background: "var(--surface-2)",
  border: "1px solid var(--border)",
  color: "var(--text)",
} as const;

type EditorCronogramaProps = {
  turmaId: number;
  nomeTurma: string;
  /** O cronograma ja' gravado, quando existe. */
  inicial: CronogramaSalvo | null;
};

export function EditorCronograma({
  turmaId,
  nomeTurma,
  inicial,
}: EditorCronogramaProps) {
  const [inicio, setInicio] = useState(inicial?.inicio ?? "");
  const [fim, setFim] = useState(inicial?.fim ?? "");
  const [periodo, setPeriodo] = useState(inicial?.periodo ?? "");
  const [texto, setTexto] = useState(
    inicial?.itens.map((item) => item.titulo).join("\n") ?? "",
  );
  const [excecoes, setExcecoes] = useState(
    inicial?.excecoes.join("\n") ?? "",
  );

  const [previa, setPrevia] = useState<PreviaDoCronograma | null>(null);
  const [salvo, setSalvo] = useState<CronogramaSalvo | null>(inicial);
  const [ocupado, setOcupado] = useState<"previa" | "salvar" | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const itens = separarLinhas(texto);
  const podePrever = inicio !== "" && fim !== "" && itens.length > 0;

  function corpo() {
    return {
      inicio,
      fim,
      itens,
      excecoes: separarLinhas(excecoes),
      periodo: periodo.trim() || null,
    };
  }

  async function chamar(metodo: "POST" | "PUT") {
    setOcupado(metodo === "POST" ? "previa" : "salvar");
    setErro(null);
    setAviso(null);
    try {
      const resposta = await fetch(`/api/cronograma/${turmaId}`, {
        method: metodo,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(corpo()),
      });
      const dados = await resposta.json();

      if (!resposta.ok) {
        // A mensagem vem da ponte, que ja' traduziu o status. Nunca inventar
        // causa aqui.
        setErro(dados?.erro ?? "Não foi possível montar o cronograma.");
        return;
      }

      if (metodo === "POST") {
        setPrevia(dados as PreviaDoCronograma);
      } else {
        const gravado = dados as CronogramaSalvo;
        setSalvo(gravado);
        setPrevia(null);
        setAviso("Cronograma salvo.");
      }
    } catch {
      setErro("Não foi possível falar com o servidor.");
    } finally {
      setOcupado(null);
    }
  }

  // A previa manda na tela enquanto existe; sem ela, mostra o que esta gravado.
  const emExibicao: PreviaDoCronograma | CronogramaSalvo | null =
    previa ?? salvo;

  return (
    <div className="flex flex-col gap-[13px]">
      <p
        className="text-text-body ml-[17px] max-w-[62ch] text-sm leading-[1.5]"
        style={{ fontWeight: 300 }}
      >
        Cole os conteúdos que você precisa cobrir com a {nomeTurma} neste
        período. O app distribui pelas aulas que existem de verdade na grade,
        descontando feriados e semanas de prova.
      </p>

      <section className="rounded-2xl p-5" style={ESTILO_CARTAO}>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="flex flex-col gap-1.5">
            <span
              className="text-[11px] font-semibold tracking-wide uppercase"
              style={{ color: "var(--text-muted)" }}
            >
              Início do período
            </span>
            <input
              type="date"
              value={inicio}
              onChange={(evento) => setInicio(evento.target.value)}
              className="rounded-xl px-3 py-2.5 text-sm"
              style={ESTILO_CAMPO}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span
              className="text-[11px] font-semibold tracking-wide uppercase"
              style={{ color: "var(--text-muted)" }}
            >
              Fim do período
            </span>
            <input
              type="date"
              value={fim}
              onChange={(evento) => setFim(evento.target.value)}
              className="rounded-xl px-3 py-2.5 text-sm"
              style={ESTILO_CAMPO}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span
              className="text-[11px] font-semibold tracking-wide uppercase"
              style={{ color: "var(--text-muted)" }}
            >
              Nome (opcional)
            </span>
            <input
              type="text"
              value={periodo}
              onChange={(evento) => setPeriodo(evento.target.value)}
              placeholder="3º bimestre"
              className="rounded-xl px-3 py-2.5 text-sm"
              style={ESTILO_CAMPO}
            />
          </label>
        </div>

        <label className="mt-5 flex flex-col gap-1.5">
          <span
            className="text-[11px] font-semibold tracking-wide uppercase"
            style={{ color: "var(--text-muted)" }}
          >
            Conteúdos — um por linha
          </span>
          <textarea
            value={texto}
            onChange={(evento) => setTexto(evento.target.value)}
            rows={8}
            placeholder={
              "Funções do 1º grau\nSistemas lineares\nFunção quadrática\nRevisão"
            }
            className="resize-y rounded-xl px-3 py-2.5 font-mono text-[13px] leading-relaxed"
            style={ESTILO_CAMPO}
          />
          <span className="text-[12px]" style={{ color: "var(--text-muted)" }}>
            {itens.length}{" "}
            {itens.length === 1 ? "conteúdo" : "conteúdos"} na lista. Cole
            direto do currículo da escola.
          </span>
        </label>

        <label className="mt-4 flex flex-col gap-1.5">
          <span
            className="text-[11px] font-semibold tracking-wide uppercase"
            style={{ color: "var(--text-muted)" }}
          >
            Datas a pular — uma por linha (opcional)
          </span>
          <textarea
            value={excecoes}
            onChange={(evento) => setExcecoes(evento.target.value)}
            rows={3}
            placeholder={"2026-09-07\n2026-10-12"}
            className="resize-y rounded-xl px-3 py-2.5 font-mono text-[13px]"
            style={ESTILO_CAMPO}
          />
          <span className="text-[12px]" style={{ color: "var(--text-muted)" }}>
            Feriados, conselho, semana de prova. Formato AAAA-MM-DD.
          </span>
        </label>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => chamar("POST")}
            disabled={!podePrever || ocupado !== null}
            className="rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-opacity disabled:opacity-50"
            style={{ background: "var(--primary)" }}
          >
            {ocupado === "previa" ? "Distribuindo…" : "Ver como fica"}
          </button>

          {/* Salvar só depois de ver a prévia: é ela que mostra se cabe. */}
          <button
            type="button"
            onClick={() => chamar("PUT")}
            disabled={previa === null || ocupado !== null}
            className="rounded-xl px-4 py-2.5 text-sm font-semibold transition-opacity disabled:opacity-50"
            style={{
              background: "var(--surface-2)",
              border: "1px solid var(--border)",
              color: "var(--text)",
            }}
          >
            {ocupado === "salvar" ? "Salvando…" : "Salvar cronograma"}
          </button>

          {erro && (
            <p className="text-[12.5px]" style={{ color: "var(--danger-fg)" }}>
              {erro}
            </p>
          )}
          {aviso && (
            <p className="text-[12.5px]" style={{ color: "var(--ok-fg)" }}>
              {aviso}
            </p>
          )}
        </div>
      </section>

      {emExibicao && <ResultadoDoCronograma resultado={emExibicao} />}
    </div>
  );
}

/**
 * O resultado da distribuicao.
 *
 * O aviso de "nao cabe" vem PRIMEIRO e em destaque: e' a razao de a feature
 * existir. Escondido no fim de uma lista de 14 itens, ele so' seria lido em
 * novembro — que e' exatamente quando ja' nao adianta.
 */
function ResultadoDoCronograma({
  resultado,
}: {
  resultado: PreviaDoCronograma | CronogramaSalvo;
}) {
  const naoCabe = !resultado.cabe;
  // `aulas_sobrando` só existe na prévia; no cronograma salvo não vem.
  const sobrando =
    "aulas_sobrando" in resultado ? resultado.aulas_sobrando : 0;

  return (
    <section className="rounded-2xl p-5" style={ESTILO_CARTAO}>
      <div className="flex flex-wrap items-center gap-3">
        <span
          style={{
            width: 34,
            height: 34,
            flex: "none",
            borderRadius: 10,
            background: naoCabe ? "var(--warn-bg)" : "var(--ok-bg)",
            color: naoCabe ? "var(--warn-fg)" : "var(--ok-fg)",
            display: "grid",
            placeItems: "center",
          }}
          aria-hidden
        >
          {naoCabe ? <IconAlerta size={16} /> : <IconCheck size={16} />}
        </span>

        <div className="min-w-0 flex-1">
          {naoCabe ? (
            <>
              <p
                className="text-[13.5px] font-semibold"
                style={{ color: "var(--text)" }}
              >
                {resultado.conteudos_sem_data}{" "}
                {resultado.conteudos_sem_data === 1
                  ? "conteúdo não cabe"
                  : "conteúdos não cabem"}{" "}
                neste período.
              </p>
              <p
                className="mt-0.5 text-[12.5px] leading-snug"
                style={{ color: "var(--text-muted)" }}
              >
                Não há aula suficiente na grade até {formatarDataCurta(
                  dataDoTimestamp(resultado.fim),
                )}
                . Melhor descobrir agora do que em novembro.
              </p>
            </>
          ) : (
            <>
              <p
                className="text-[13.5px] font-semibold"
                style={{ color: "var(--text)" }}
              >
                Os {resultado.conteudos} conteúdos cabem no período.
              </p>
              {sobrando > 0 && (
                <p
                  className="mt-0.5 text-[12.5px]"
                  style={{ color: "var(--text-muted)" }}
                >
                  Sobram {sobrando}{" "}
                  {sobrando === 1 ? "aula livre" : "aulas livres"} — espaço para
                  revisão, prova ou recuperação.
                </p>
              )}
            </>
          )}
        </div>
      </div>

      <ol className="mt-5 flex flex-col gap-2">
        {resultado.itens.map((item) => (
          <li
            key={item.ordem}
            className="flex flex-wrap items-center gap-3 rounded-xl px-3.5 py-2.5"
            style={{
              background: item.data === null ? "var(--warn-bg)" : "var(--surface-2)",
            }}
          >
            <span
              className="flex-none text-[11px] font-semibold tabular-nums"
              style={{ color: "var(--text-muted)" }}
            >
              {String(item.ordem + 1).padStart(2, "0")}
            </span>

            <span
              className="min-w-0 flex-1 text-[13.5px]"
              style={{ color: "var(--text)" }}
            >
              {item.titulo}
            </span>

            {item.data === null ? (
              <span
                className="flex flex-none items-center gap-1.5 text-[12px] font-semibold"
                style={{ color: "var(--warn-fg)" }}
              >
                <IconAlerta size={12} />
                sem data
              </span>
            ) : (
              <span
                className="flex flex-none items-center gap-1.5 text-[12px] tabular-nums"
                style={{ color: "var(--text-muted)" }}
              >
                <IconCalendario size={12} />
                {formatarDataCurta(dataDoTimestamp(item.data))}
                {item.materia && ` · ${item.materia}`}
              </span>
            )}
          </li>
        ))}
      </ol>

      <p
        className="mt-4 text-[12px] leading-relaxed"
        style={{ color: "var(--text-muted)" }}
      >
        Um conteúdo por dia de encontro com a turma. Uma turma com vários tempos
        na mesma segunda tem um encontro naquele dia, não vários.
      </p>
    </section>
  );
}
