"use client";

import { useState } from "react";

import { TextoFormatado } from "@/components/ia/texto-formatado";
import { IconCadeado, IconCopiar, IconEstrela } from "@/components/ui/icons";
import type { FormatoDoResumo, ResumoDoAluno } from "@/lib/types";

/**
 * Feature F7 — o resumo da aula escrito pro aluno estudar.
 *
 * A TROCA QUE ESTA FEATURE REPRESENTA
 * -----------------------------------
 * A ideia original (do Chris) era uma camera dedicada ao aluno especial,
 * avaliando a atencao dele. O objetivo — dar suporte a esse aluno — e' bom; o
 * caminho contradiz o nucleo do produto, que so' classifica comportamento de
 * forma coletiva e nunca vinculada a um RA.
 *
 * A F7 entrega o MESMO objetivo por outro caminho: em vez de a camera vigiar o
 * aluno, o MATERIAL se adapta a ele. Sem estigma (ninguem na sala ve uma
 * camera apontada pra um colega), sem risco juridico, e serve tambem quem nao
 * tem laudo — quem faltou, quem nao entendeu, quem quer revisar.
 *
 * POR QUE O SELETOR NAO DIZ O PUBLICO-ALVO
 * ----------------------------------------
 * A tela mostra "Blocos curtos", nunca "formato pra TDAH". Assim o aluno
 * escolhe o que funciona pra ele sem precisar se declarar, e um colega que
 * olhe a tela por cima do ombro nao le diagnostico nenhum.
 *
 * A TRAVA DO 'PUBLICAR' E' OBRIGATORIA
 * ------------------------------------
 * A transcricao bruta pega o professor errando, brincadeira interna da sala,
 * aluno citado pelo nome. Sem essa trava, o professor perde o controle do que
 * a turma le dele — e uma ferramenta que ameaca o professor morre tao rapido
 * quanto uma que da' trabalho.
 *
 * Hoje nada e' publicado: o acesso do aluno (login, permissao, escopo) foi
 * adiado. Isto e' a PREVIA que o professor ve do que o aluno veria.
 */

const ESTILO_CAMPO = {
  background: "var(--surface-2)",
  border: "1px solid var(--border)",
  color: "var(--text)",
} as const;

export function ResumoParaOAluno({
  sessaoId,
  formatos,
}: {
  sessaoId: number;
  /** Formatos disponíveis, buscados no servidor. */
  formatos: FormatoDoResumo[];
}) {
  const [formato, setFormato] = useState(formatos[0]?.id ?? "padrao");
  const [resumo, setResumo] = useState<ResumoDoAluno | null>(null);
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  async function gerar() {
    setGerando(true);
    setErro(null);
    try {
      const resposta = await fetch(`/api/resumo-aluno/${sessaoId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formato }),
      });
      const dados = await resposta.json();

      if (!resposta.ok) {
        // A mensagem vem da ponte, que já traduziu o status. Nunca inventar
        // causa aqui.
        setErro(dados?.erro ?? "Não foi possível gerar o resumo.");
        setResumo(null);
        return;
      }
      setResumo(dados as ResumoDoAluno);
    } catch {
      setErro("Não foi possível falar com o servidor.");
      setResumo(null);
    } finally {
      setGerando(false);
    }
  }

  async function copiar() {
    if (!resumo) return;
    try {
      await navigator.clipboard.writeText(resumo.texto);
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
    <div>
      <p
        className="text-[12.5px] leading-relaxed"
        style={{ color: "var(--text-body)" }}
      >
        Um resumo desta aula escrito para o aluno estudar, a partir do que já foi
        registrado. Escolha o formato que funciona melhor para quem vai ler.
      </p>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label className="flex min-w-[200px] flex-1 flex-col gap-1.5">
          <span
            className="text-[11px] font-semibold tracking-wide uppercase"
            style={{ color: "var(--text-muted)" }}
          >
            Formato
          </span>
          {/* Só o rótulo: a `descricao` que a API devolve é a instrução do
              prompt, texto interno que não foi escrito pra ninguém ler. */}
          <select
            value={formato}
            onChange={(evento) => {
              setFormato(evento.target.value);
              // O texto anterior é de OUTRO formato: mantê-lo na tela depois
              // da troca faria o professor achar que o novo formato saiu igual.
              setResumo(null);
              setErro(null);
            }}
            className="cursor-pointer rounded-xl px-3 py-2.5 text-sm font-semibold"
            style={ESTILO_CAMPO}
          >
            {formatos.map((item) => (
              <option key={item.id} value={item.id}>
                {item.rotulo}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          onClick={gerar}
          disabled={gerando}
          className="flex flex-none items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-opacity disabled:opacity-50"
          style={{ background: "var(--primary)" }}
        >
          <IconEstrela size={13} />
          {gerando ? "Escrevendo…" : "Gerar resumo"}
        </button>
      </div>

      {erro && (
        <p className="mt-3 text-[12.5px]" style={{ color: "var(--danger-fg)" }}>
          {erro}
        </p>
      )}

      {resumo && (
        <div className="mt-5">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
            <span
              className="text-[11px] font-semibold tracking-wide uppercase"
              style={{ color: "var(--text-muted)" }}
            >
              {resumo.rotulo}
            </span>

            <button
              type="button"
              onClick={copiar}
              className="flex flex-none items-center gap-2 rounded-xl px-3.5 py-2 text-[12.5px] font-semibold transition-transform hover:-translate-y-px"
              style={{
                background: "var(--surface-2)",
                border: "1px solid var(--border)",
                color: "var(--text)",
              }}
            >
              <IconCopiar size={13} />
              {copiado ? "Copiado" : "Copiar"}
            </button>
          </div>

          {/* MEDIDO CONTRA A API REAL em 24/08: o modelo devolve markdown
              ("### titulo", "**IMPORTANTE:**"). Com `whitespace-pre-wrap` o
              aluno leria os asteriscos crus — e o formato "blocos curtos", que
              existe justamente pra sinalizar prioridade, perderia a sinalizacao.
              `TextoFormatado` e' o mesmo renderizador do Cup AI e do conteudo
              da aula. */}
          <div
            className="rounded-xl px-4 py-3.5 text-[13.5px] leading-relaxed"
            style={ESTILO_CAMPO}
          >
            <TextoFormatado texto={resumo.texto} />
          </div>

          {/* A trava, dita em voz alta. Não é rodapé decorativo: é o contrato
              da feature com o professor, e ele precisa lê-lo antes de confiar
              o material da aula dele ao app. */}
          <p
            className="mt-3 flex items-start gap-2 text-[12px] leading-relaxed"
            style={{ color: "var(--text-muted)" }}
          >
            <span className="mt-0.5 flex-none">
              <IconCadeado size={13} />
            </span>
            Só você está vendo isto. O acesso do aluno ainda não existe, e nada
            chega a ele sem você mandar.
          </p>
        </div>
      )}
    </div>
  );
}
