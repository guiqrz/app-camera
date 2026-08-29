"use client";

import { useId, useState } from "react";

import {
  IconAlerta,
  IconCalendario,
  IconCheck,
  IconLixeira,
  IconMais,
} from "@/components/ui/icons";
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
 *
 * REFORMA DE CLAREZA (29/08/2026)
 * --------------------------------
 * Ele apontou a tela como confusa. O que estava errado, especificamente:
 *   - dois textarea do MESMO tamanho pra coisas de peso muito diferente —
 *     conteudos e' o miolo da feature, excecoes e' o caso raro;
 *   - o contador ("0 conteúdos na lista") lia como CONTAGEM ERRADA quando o
 *     textarea mostrava so' o placeholder de exemplo — nao e' bug de logica,
 *     e' o placeholder se disfarcando de dado real;
 *   - "Salvar cronograma" parecia clicavel mas vinha desabilitado (a regra
 *     "so' salva depois de ver a previa" ja' existia) sem dizer o motivo;
 *   - datas a pular pediam AAAA-MM-DD escrito a mao, com date pickers de
 *     verdade duas linhas acima;
 *   - nao havia estado proprio pra "esta turma ainda nao tem cronograma".
 * As correcoes estao marcadas abaixo, uma por uma.
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

const ROTULO_CAMPO =
  "text-[11px] font-semibold tracking-wide uppercase";

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
  // CORRECAO: excecoes agora e' uma LISTA de datas, uma por vez, com
  // <input type="date"> — nao mais um textarea de texto livre em AAAA-MM-DD.
  // Guardado como array de verdade, e nao como string com quebra de linha: e'
  // o formato que o formulario abaixo edita.
  const [excecoes, setExcecoes] = useState<string[]>(inicial?.excecoes ?? []);
  // Painel de "datas a pular" comeca FECHADO: e' o caso raro, e destaca-lo do
  // mesmo jeito que os conteudos sugeriria que os dois pesam igual.
  const [mostrarExcecoes, setMostrarExcecoes] = useState(
    (inicial?.excecoes.length ?? 0) > 0,
  );

  const [previa, setPrevia] = useState<PreviaDoCronograma | null>(null);
  const [salvo, setSalvo] = useState<CronogramaSalvo | null>(inicial);
  const [ocupado, setOcupado] = useState<"previa" | "salvar" | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const idInicio = useId();
  const idFim = useId();
  const idPeriodo = useId();
  const idConteudos = useId();

  const itens = separarLinhas(texto);
  const podePrever = inicio !== "" && fim !== "" && itens.length > 0;
  // Mudou desde a ultima previa vista? Se mudou, a previa na tela nao
  // corresponde mais ao que seria salvo — Salvar tem que ficar bloqueado ate'
  // o professor conferir de novo.
  const previaDesatualizada = previa === null;

  function corpo() {
    return {
      inicio,
      fim,
      itens,
      // Filtra linhas vazias: "Adicionar data" comeca sem valor, e enviar ""
      // junto das datas reais so' sujaria o `excecoes_json` gravado.
      excecoes: excecoes.filter(Boolean),
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

  // Qualquer edicao depois de ver a previa invalida ela: o que esta na tela
  // deixou de refletir o que seria salvo. Chamado pelos onChange abaixo.
  function aoEditar() {
    if (previa !== null) setPrevia(null);
  }

  function adicionarExcecao() {
    setExcecoes((atuais) => [...atuais, ""]);
    aoEditar();
  }

  function mudarExcecao(indice: number, valor: string) {
    setExcecoes((atuais) =>
      atuais.map((data, i) => (i === indice ? valor : data)),
    );
    aoEditar();
  }

  function removerExcecao(indice: number) {
    setExcecoes((atuais) => atuais.filter((_, i) => i !== indice));
    aoEditar();
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

      {/* CORRECAO: turma sem cronograma ganha um estado PROPRIO, em vez de a
          tela simplesmente aparecer com campos vazios sem dizer nada. */}
      {inicial === null && salvo === null && (
        <div
          className="ml-[17px] flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-[12.5px]"
          style={{ background: "var(--surface-2)", color: "var(--text-muted)" }}
        >
          <IconCalendario size={13} />
          Esta turma ainda não tem cronograma. Preencha abaixo para criar o
          primeiro.
        </div>
      )}

      <section className="rounded-2xl p-5" style={ESTILO_CARTAO}>
        <div className="grid gap-4 sm:grid-cols-3">
          <label htmlFor={idInicio} className="flex flex-col gap-1.5">
            <span className={ROTULO_CAMPO} style={{ color: "var(--text-muted)" }}>
              Início do período
            </span>
            <input
              id={idInicio}
              type="date"
              value={inicio}
              onChange={(evento) => {
                setInicio(evento.target.value);
                aoEditar();
              }}
              className="rounded-xl px-3 py-2.5 text-sm"
              style={ESTILO_CAMPO}
            />
          </label>

          <label htmlFor={idFim} className="flex flex-col gap-1.5">
            <span className={ROTULO_CAMPO} style={{ color: "var(--text-muted)" }}>
              Fim do período
            </span>
            <input
              id={idFim}
              type="date"
              value={fim}
              onChange={(evento) => {
                setFim(evento.target.value);
                aoEditar();
              }}
              className="rounded-xl px-3 py-2.5 text-sm"
              style={ESTILO_CAMPO}
            />
          </label>

          <label htmlFor={idPeriodo} className="flex flex-col gap-1.5">
            <span className={ROTULO_CAMPO} style={{ color: "var(--text-muted)" }}>
              Nome (opcional)
            </span>
            <input
              id={idPeriodo}
              type="text"
              value={periodo}
              onChange={(evento) => {
                setPeriodo(evento.target.value);
                aoEditar();
              }}
              placeholder="3º bimestre"
              className="rounded-xl px-3 py-2.5 text-sm"
              style={ESTILO_CAMPO}
            />
          </label>
        </div>

        {/* CORRECAO: o rotulo do bloco principal ganhou peso proprio (14px, nao
            11px uppercase igual aos outros campos) — ele e' O QUE O
            PROFESSOR VEIO FAZER AQUI, e precisa parecer maior que "Nome
            (opcional)" ao lado. */}
        <label htmlFor={idConteudos} className="mt-6 flex flex-col gap-1.5">
          <span
            className="text-[14px] font-semibold"
            style={{ color: "var(--text)" }}
          >
            Conteúdos do período
          </span>
          <span className="text-[12px]" style={{ color: "var(--text-muted)" }}>
            Um por linha, na ordem em que você vai dar. Cole direto do
            currículo da escola.
          </span>
          <textarea
            id={idConteudos}
            value={texto}
            onChange={(evento) => {
              setTexto(evento.target.value);
              aoEditar();
            }}
            rows={8}
            placeholder={
              "Funções do 1º grau\nSistemas lineares\nFunção quadrática\nRevisão"
            }
            className="mt-1 resize-y rounded-xl px-3 py-2.5 font-mono text-[13px] leading-relaxed"
            style={ESTILO_CAMPO}
          />
          {/* CORRECAO: o contador so' aparece com pelo menos 1 item. "0
              conteúdos na lista" ao lado de um textarea mostrando so' o
              PLACEHOLDER lia como contagem errada — o professor via 4 linhas
              de exemplo e um "0" ao lado. Textarea vazio agora fica silencioso;
              a instrucao acima ja' basta. */}
          {itens.length > 0 && (
            <span
              className="text-[12px] font-medium"
              style={{ color: "var(--text-muted)" }}
            >
              {itens.length} {itens.length === 1 ? "conteúdo" : "conteúdos"} na
              lista.
            </span>
          )}
        </label>

        {/* CORRECAO: "Datas a pular" vira uma secao RECOLHIDA por padrao, do
            tamanho de um link — nao mais um textarea do mesmo porte do bloco
            principal. E' o caso raro (feriado, conselho, prova) tratado como
            raro. */}
        <div className="mt-5">
          {!mostrarExcecoes ? (
            <button
              type="button"
              onClick={() => setMostrarExcecoes(true)}
              className="flex items-center gap-1.5 text-[12.5px] font-semibold transition-colors"
              style={{ color: "var(--text-muted)" }}
            >
              <IconMais size={13} />
              Pular feriado, conselho ou semana de prova
              {excecoes.length > 0 && ` (${excecoes.length})`}
            </button>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span
                  className={ROTULO_CAMPO}
                  style={{ color: "var(--text-muted)" }}
                >
                  Datas a pular
                </span>
                {excecoes.length === 0 && (
                  <button
                    type="button"
                    onClick={() => setMostrarExcecoes(false)}
                    className="text-[12px] underline"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Fechar
                  </button>
                )}
              </div>

              {/* CORRECAO: um <input type="date"> por linha, igual aos campos
                  de inicio/fim acima — em vez de exigir "AAAA-MM-DD" escrito a
                  mao logo abaixo de dois date pickers nativos. */}
              {excecoes.map((data, indice) => (
                <div key={indice} className="flex items-center gap-2">
                  <input
                    type="date"
                    value={data}
                    onChange={(evento) =>
                      mudarExcecao(indice, evento.target.value)
                    }
                    className="rounded-xl px-3 py-2 text-sm"
                    style={ESTILO_CAMPO}
                  />
                  <button
                    type="button"
                    onClick={() => removerExcecao(indice)}
                    aria-label="Remover esta data"
                    className="rounded-lg p-2 transition-colors"
                    style={{ color: "var(--text-muted)" }}
                  >
                    <IconLixeira size={14} />
                  </button>
                </div>
              ))}

              <button
                type="button"
                onClick={adicionarExcecao}
                className="flex w-fit items-center gap-1.5 text-[12.5px] font-semibold"
                style={{ color: "var(--primary)" }}
              >
                <IconMais size={12} />
                Adicionar data
              </button>

              <span className="text-[11.5px]" style={{ color: "var(--text-muted)" }}>
                O app já desconta os feriados nacionais — só as datas
                específicas da turma precisam entrar aqui.
              </span>
            </div>
          )}
        </div>

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

          {/* CORRECAO: o botao desabilitado agora diz PRA QUE serve o passo
              anterior, em vez de so' aparecer apagado sem explicacao — a
              regra ("so' salva depois de ver a previa, e ela some a cada
              edicao") ja' existia no `disabled`, so' nao era comunicada. */}
          <div className="flex flex-col gap-1">
            <button
              type="button"
              onClick={() => chamar("PUT")}
              disabled={previaDesatualizada || ocupado !== null}
              title={
                previaDesatualizada
                  ? "Clique em “Ver como fica” primeiro"
                  : undefined
              }
              className="rounded-xl px-4 py-2.5 text-sm font-semibold transition-opacity disabled:opacity-50"
              style={{
                background: "var(--surface-2)",
                border: "1px solid var(--border)",
                color: "var(--text)",
              }}
            >
              {ocupado === "salvar" ? "Salvando…" : "Salvar cronograma"}
            </button>
            {previaDesatualizada && !erro && (
              <span
                className="text-[11px]"
                style={{ color: "var(--text-muted)" }}
              >
                Veja como fica antes de salvar
              </span>
            )}
          </div>

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
