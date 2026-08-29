"use client";

import { useState } from "react";

import { IconCopiar, IconEstrela, IconInfo } from "@/components/ui/icons";
import type { RascunhoDePeriodo } from "@/lib/types";

/**
 * Feature F2 (conselho de classe).
 *
 * POR QUE A F2 E' A PRIORIDADE 1 DO LOTE
 * --------------------------------------
 * E' a dor mais citada e mais odiada da pesquisa de 23/08, com voz crua:
 * "preencher a ficha se torna mais importante do que resolver o que a ficha
 * deveria apontar". Uma professora passou o fim de semana inteiro preenchendo
 * relatorio. Na enquete do Tes, 2 dos 8 maiores desperdicios de tempo do
 * professor sao preenchimento.
 *
 * E' a feature que mais TIRA trabalho — e trabalho que ninguem defende.
 *
 * O APP NAO GRAVA E NAO ENVIA NADA
 * --------------------------------
 * O texto volta pro professor ler, corrigir e colar no formulario da escola. O
 * documento vai ser assinado por ele, entao a decisao de usar e' dele — mesmo
 * padrao ja' provado pelo diario (feature I).
 *
 * Isso nao e' cautela juridica: e' o que separa a ferramenta que o professor
 * adota da que ele sabota. Um app que manda coisas em nome dele, sem ele ver,
 * e' um app que ele desliga.
 */

/* O gerador nasceu com dois relatorios (conselho e boletim pra familia). O
   boletim foi removido a pedido do professor em 25/08/2026, entao o seletor
   de tipo saiu junto: um radiogroup de uma opcao so' e' controle morto. O
    continua indo no corpo da requisicao porque a ponte e a API ainda
   discriminam por ele. */
const TIPO = "conselho" as const;

const ESCOLHIDO = {
  rotulo: "Rascunho do conselho",
  aviso:
    "Leva a frequência média da turma. Nunca engajamento por aluno, nunca transcrição.",
};

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

export function GeradorRelatoriosPeriodo({
  turmaId,
  nomeTurma,
}: {
  turmaId: number;
  nomeTurma: string;
}) {
  const [inicio, setInicio] = useState("");
  const [fim, setFim] = useState("");
  const [periodo, setPeriodo] = useState("");

  const [resultado, setResultado] = useState<RascunhoDePeriodo | null>(null);
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  // O texto é editável: o professor corrige antes de usar, e é essa correção
  // que faz o documento ser dele. Guardado separado do `resultado` pra não
  // perder o original quando ele edita.
  const [textoEditado, setTextoEditado] = useState("");

  const podeGerar = inicio !== "" && fim !== "" && !gerando;

  async function gerar() {
    setGerando(true);
    setErro(null);
    setResultado(null);
    try {
      const resposta = await fetch(`/api/relatorios-periodo/${turmaId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo: TIPO,
          inicio,
          fim,
          periodo: periodo.trim() || null,
        }),
      });
      const dados = await resposta.json();

      if (!resposta.ok) {
        // A mensagem vem da ponte, que já traduziu o status. Nunca inventar
        // causa aqui.
        setErro(dados?.erro ?? "Não foi possível gerar o texto.");
        return;
      }

      const pronto = dados as RascunhoDePeriodo;
      setResultado(pronto);
      setTextoEditado(pronto.texto);
    } catch {
      setErro("Não foi possível falar com o servidor.");
    } finally {
      setGerando(false);
    }
  }

  async function copiar() {
    try {
      await navigator.clipboard.writeText(textoEditado);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // `navigator.clipboard` falha fora de HTTPS e quando o navegador nega a
      // permissão. Dizer isso é melhor que deixar o professor achando que o
      // botão está quebrado.
      setErro(
        "Não foi possível copiar. Verifique a permissão da área de transferência.",
      );
    }
  }

  return (
    <div className="flex flex-col gap-[13px]">
      <p
        className="text-text-body ml-[17px] max-w-[62ch] text-sm leading-[1.5]"
        style={{ fontWeight: 300 }}
      >
        O app já sabe o que foi dado em cada aula da {nomeTurma}. Escolha o
        período e ele monta o rascunho — você lê, corrige e usa.
      </p>

      <section className="rounded-2xl p-5" style={ESTILO_CARTAO}>

        {/* --- O período --- */}
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <label className="flex flex-col gap-1.5">
            <span
              className="text-[11px] font-semibold tracking-wide uppercase"
              style={{ color: "var(--text-muted)" }}
            >
              Início
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
              Fim
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

        {/* O que atravessa e o que não atravessa. Fica visível ANTES de gerar,
            não escondido num rodapé: o professor precisa saber o que o texto
            carrega antes de mandá-lo pra alguém. */}
        <p
          className="mt-4 flex items-start gap-2 text-[12px] leading-relaxed"
          style={{ color: "var(--text-muted)" }}
        >
          <span className="mt-0.5 flex-none">
            <IconInfo size={13} />
          </span>
          {ESCOLHIDO.aviso}
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={gerar}
            disabled={!podeGerar}
            className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-opacity disabled:opacity-50"
            style={{ background: "var(--primary)" }}
          >
            <IconEstrela size={13} />
            {gerando ? "Escrevendo…" : `Gerar ${ESCOLHIDO.rotulo.toLowerCase()}`}
          </button>

          {erro && (
            <p className="text-[12.5px]" style={{ color: "var(--danger-fg)" }}>
              {erro}
            </p>
          )}
        </div>
      </section>

      {/* --- O rascunho --- */}
      {resultado && (
        <section className="rounded-2xl p-5" style={ESTILO_CARTAO}>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2
                className="text-[11px] font-semibold tracking-wide uppercase"
                style={{ color: "var(--text-muted)" }}
              >
                {ESCOLHIDO.rotulo}
              </h2>
              {/* Sobre QUANTO material o texto foi escrito. Sem isso o
                  professor não tem como julgar se pode confiar nele: um
                  rascunho de 12 aulas registradas vale muito mais que um de 2. */}
              <p
                className="mt-0.5 text-[12px]"
                style={{ color: "var(--text-muted)" }}
              >
                Escrito a partir de {resultado.aulas_com_conteudo} de{" "}
                {resultado.aulas_no_periodo}{" "}
                {resultado.aulas_no_periodo === 1 ? "aula" : "aulas"} com
                conteúdo registrado
                {resultado.frequencia_media != null &&
                  ` · frequência média ${resultado.frequencia_media}%`}
                .
              </p>
            </div>

            <button
              type="button"
              onClick={copiar}
              className="flex flex-none items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-transform hover:-translate-y-px"
              style={{
                background: "var(--surface-2)",
                border: "1px solid var(--border)",
                color: "var(--text)",
              }}
            >
              <IconCopiar size={14} />
              {copiado ? "Copiado" : "Copiar"}
            </button>
          </div>

          {/* Editável de propósito: a correção do professor é o que faz o
              documento ser dele, não do modelo. */}
          <textarea
            value={textoEditado}
            onChange={(evento) => setTextoEditado(evento.target.value)}
            rows={16}
            className="w-full resize-y rounded-xl px-3.5 py-3 text-[13.5px] leading-relaxed"
            style={ESTILO_CAMPO}
            aria-label={`Texto do ${ESCOLHIDO.rotulo.toLowerCase()}, editável`}
          />

          <p
            className="mt-3 text-[12px] leading-relaxed"
            style={{ color: "var(--text-muted)" }}
          >
            Rascunho escrito pela Cup AI ({resultado.modelo}). O app não grava
            nem envia nada: leia, corrija e use. O documento é seu.
          </p>
        </section>
      )}
    </div>
  );
}
