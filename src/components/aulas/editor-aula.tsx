"use client";

import { useEffect, useId, useRef, useState } from "react";

import { useFocoPreso } from "@/components/coordenacao/usar-foco-preso";
import { BotaoIcone } from "@/components/ui/botao-icone";
import {
  IconBaixar,
  IconClipe,
  IconFechar,
  IconLixeira,
  IconSubir,
} from "@/components/ui/icons";
import type { Aula } from "@/lib/types";

/** Espelha o max_length do model PlanoDaAula no backend. */
const MAXIMO_PLANO = 200;

/** Espelha TAMANHO_MAXIMO_ANEXO_AULA_BYTES em cupcam/web/api.py. */
const MAXIMO_ANEXO_BYTES = 10 * 1024 * 1024;

function formatarTamanho(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type Props = {
  /** Aula sendo editada. `null` fecha o painel. */
  aula: Aula | null;
  aoFechar: () => void;
  /** Chamado depois de salvar, pra tela recarregar os dados do servidor. */
  aoSalvar: () => void;
};

/**
 * Painel de preparacao da aula: o plano e o material.
 *
 * Os dois pertencem a AULA DA GRADE, nao a sessao gravada — sao preparacao,
 * existem antes de a camera ligar e valem em toda repeticao semanal daquela
 * aula (ver o docstring de gestao/planos.py no backend).
 *
 * O prototipo tinha um terceiro campo, "link do slide". Ele NAO foi feito: nao
 * existe coluna pra ele no banco, e inventar um lugar (guardar a URL dentro do
 * texto do plano, por exemplo) criaria um campo fantasma que nenhuma outra
 * parte do sistema saberia ler. Fica como decisao do usuario adicionar depois.
 */
export function EditorAula({ aula, aoFechar, aoSalvar }: Props) {
  const [plano, setPlano] = useState("");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [removerAnexo, setRemoverAnexo] = useState(false);
  const [arrastando, setArrastando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const aberto = aula !== null;
  const refPainel = useFocoPreso(aberto);
  const refPlano = useRef<HTMLTextAreaElement>(null);
  const refArquivo = useRef<HTMLInputElement>(null);
  const idTitulo = useId();

  // Reset na transicao fechado->aberto, durante a renderizacao — o padrao
  // oficial do React pra estado derivado de props, em vez de setState num
  // useEffect. Mesmo molde do ModalMateria.
  const [aulaAnterior, setAulaAnterior] = useState(aula?.id ?? null);
  if ((aula?.id ?? null) !== aulaAnterior) {
    setAulaAnterior(aula?.id ?? null);
    setPlano(aula?.plano ?? "");
    setArquivo(null);
    setRemoverAnexo(false);
    setErro(null);
    setEnviando(false);
  }

  useEffect(() => {
    if (!aberto) return;
    refPlano.current?.focus();
  }, [aberto]);

  useEffect(() => {
    if (!aberto) return;
    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") aoFechar();
    };
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [aberto, aoFechar]);

  useEffect(() => {
    if (!aberto) return;
    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = anterior;
    };
  }, [aberto]);

  // Ctrl+V com o painel aberto anexa o arquivo do clipboard — o caminho mais
  // rapido pra quem acabou de printar um slide.
  useEffect(() => {
    if (!aberto) return;
    const aoColar = (evento: ClipboardEvent) => {
      const colado = evento.clipboardData?.files?.[0];
      if (colado) {
        evento.preventDefault();
        escolherArquivo(colado);
      }
    };
    document.addEventListener("paste", aoColar);
    return () => document.removeEventListener("paste", aoColar);
  }, [aberto]);

  if (!aula) return null;

  function escolherArquivo(escolhido: File) {
    if (escolhido.size > MAXIMO_ANEXO_BYTES) {
      setErro(
        `O arquivo tem ${formatarTamanho(escolhido.size)} — o limite é 10 MB.`,
      );
      return;
    }
    if (escolhido.size === 0) {
      setErro("O arquivo está vazio.");
      return;
    }
    setErro(null);
    setArquivo(escolhido);
    setRemoverAnexo(false);
  }

  async function salvar() {
    if (!aula) return;
    setErro(null);
    setEnviando(true);

    try {
      // O plano vai sempre: texto vazio LIMPA o plano, que e' como a tela apaga.
      if (plano !== aula.plano) {
        const resposta = await fetch(`/api/admin/aulas/${aula.id}/plano`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ texto: plano }),
        });
        if (!resposta.ok) throw new Error("Não foi possível salvar o plano.");
      }

      if (arquivo) {
        const form = new FormData();
        form.append("arquivo", arquivo);
        const resposta = await fetch(`/api/admin/aulas/${aula.id}/anexo`, {
          method: "PUT",
          body: form,
        });
        if (!resposta.ok) throw new Error("Não foi possível enviar o arquivo.");
      } else if (removerAnexo && aula.tem_anexo) {
        const resposta = await fetch(`/api/admin/aulas/${aula.id}/anexo`, {
          method: "DELETE",
        });
        if (!resposta.ok) throw new Error("Não foi possível remover o anexo.");
      }

      aoSalvar();
    } catch (causa) {
      setErro(causa instanceof Error ? causa.message : "Não foi possível salvar.");
      setEnviando(false);
    }
  }

  // O anexo mostrado: o novo escolhido tem prioridade sobre o que ja estava.
  const anexoAtual = arquivo
    ? { nome: arquivo.name, tamanho: arquivo.size, novo: true }
    : !removerAnexo && aula.tem_anexo && aula.anexo_nome
      ? { nome: aula.anexo_nome, tamanho: aula.anexo_tamanho ?? 0, novo: false }
      : null;

  return (
    // Fundo do prototipo (.fundo-painel): veu roxo escuro a 28% com blur de
    // 2px — nao o preto a 50% dos modais. O painel e' uma gaveta lateral, nao
    // um modal centrado: escurecer demais faria a agenda atras sumir, e ela e'
    // o contexto do que se esta editando.
    <div
      className="fixed inset-0 z-40 flex justify-end"
      style={{
        background: "rgba(30, 18, 45, 0.28)",
        backdropFilter: "blur(2px)",
      }}
      onClick={aoFechar}
    >
      <aside
        ref={refPainel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        onClick={(evento) => evento.stopPropagation()}
        className="relative flex h-full w-[min(380px,100vw)] flex-col"
        style={{
          background: "var(--surface)",
          borderLeft: "1px solid var(--border)",
          backdropFilter: "var(--blur-card)",
        }}
      >
        {/* O vidro do painel precisa de algo opaco atras: sobre a pagina
            rolada ele ficaria ilegivel. Camada abaixo do conteudo (-z-10),
            dentro do proprio painel. */}
        <span
          aria-hidden
          className="absolute inset-0 -z-10"
          style={{ background: "var(--painel-solido)", opacity: 0.92 }}
        />

        {/* .editor-topo: 16px 18px 12px, h2 de 15px peso 650. */}
        <div className="border-border-default flex items-start gap-[10px] border-b px-[18px] pt-4 pb-3">
          <div className="min-w-0 flex-1">
            <h2
              id={idTitulo}
              className="text-text truncate text-[15px]"
              style={{ fontWeight: 650 }}
            >
              {aula.materia_nome ?? "Sem matéria"} · {aula.hora_inicio}
            </h2>
            <p className="text-text-muted mt-0.5 text-[10.5px] capitalize">
              {aula.dia_semana_nome} · {aula.turma_nome}
            </p>
          </div>
          <BotaoIcone
            rotulo="Fechar"
            aoClicar={aoFechar}
            desabilitado={enviando}
            cor="var(--text-muted)"
          >
            <IconFechar size={16} />
          </BotaoIcone>
        </div>

        {/* .editor-corpo: 16px 18px, gap 16px. */}
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-[18px] py-4">
          {/* .campo: gap 6px. .campo-rotulo: 10px, peso 700, tracking .1em,
              MAIUSCULA e apagado — e' etiqueta, nao titulo. */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="campo-plano"
              className="text-text-muted text-[10px] font-bold tracking-[0.1em] uppercase"
            >
              Plano da aula
            </label>
            <textarea
              id="campo-plano"
              ref={refPlano}
              value={plano}
              onChange={(evento) => setPlano(evento.target.value)}
              maxLength={MAXIMO_PLANO}
              disabled={enviando}
              placeholder="Em uma frase: o que você vai dar nesta aula"
              className="bg-surface-2 border-border-default text-text placeholder:text-text-muted min-h-[66px] w-full resize-y rounded-[9px] border px-[11px] py-[9px] text-[12.5px] outline-none focus:outline-2 focus:-outline-offset-1 focus:outline-[var(--primary-hover)]"
            />
            {/* O limite e' visivel ENQUANTO se escreve, nao um erro depois de
                enviar. Fica ambar perto do fim pra avisar antes de cortar. */}
            <span
              className="self-end text-[10px] tabular-nums"
              style={{
                color:
                  plano.length > MAXIMO_PLANO - 20
                    ? "var(--warn-fg)"
                    : "var(--text-muted)",
                fontWeight: plano.length > MAXIMO_PLANO - 20 ? 600 : 400,
              }}
            >
              {plano.length}/{MAXIMO_PLANO}
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-text-muted text-[10px] font-bold tracking-[0.1em] uppercase">
              Material
            </span>
            <span className="text-text-muted text-[10.5px]">
              Um arquivo por aula — enviar outro substitui o atual.
            </span>

            {anexoAtual ? (
              <div className="bg-surface border-border-default flex items-center gap-3 rounded-xl border px-3.5 py-3">
                <IconClipe size={16} className="text-text-muted flex-none" />
                <div className="min-w-0 flex-1">
                  <p className="text-text-body truncate text-sm">
                    {anexoAtual.nome}
                  </p>
                  <p className="text-text-muted text-[11px]">
                    {formatarTamanho(anexoAtual.tamanho)}
                    {anexoAtual.novo && " · será enviado ao salvar"}
                  </p>
                </div>

                {/* Baixar so' faz sentido pro anexo QUE JA ESTA no servidor —
                    o recem-escolhido ainda esta no computador do professor. */}
                {!anexoAtual.novo && (
                  <a
                    href={`/api/admin/aulas/${aula.id}/anexo`}
                    className="text-text-muted hover:text-primary flex-none rounded-lg p-1.5"
                    aria-label={`Baixar ${anexoAtual.nome}`}
                  >
                    <IconBaixar size={16} />
                  </a>
                )}

                <button
                  type="button"
                  onClick={() => {
                    if (anexoAtual.novo) setArquivo(null);
                    else setRemoverAnexo(true);
                  }}
                  disabled={enviando}
                  className="text-text-muted hover:text-danger flex-none rounded-lg p-1.5"
                  aria-label={`Remover ${anexoAtual.nome}`}
                >
                  <IconLixeira size={16} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => refArquivo.current?.click()}
                onDragEnter={(evento) => {
                  evento.preventDefault();
                  setArrastando(true);
                }}
                onDragOver={(evento) => evento.preventDefault()}
                onDragLeave={() => setArrastando(false)}
                onDrop={(evento) => {
                  evento.preventDefault();
                  setArrastando(false);
                  const solto = evento.dataTransfer.files[0];
                  if (solto) escolherArquivo(solto);
                }}
                disabled={enviando}
                className="flex flex-col items-center gap-[5px] rounded-[9px] px-3 py-4 text-center text-[11.5px] transition-colors"
                style={{
                  // 1.5px cravado: a classe border-[1.5px] do Tailwind sai
                  // como 0.8px no computado (ele resolve em rem e o browser
                  // arredonda), e o tracejado fica fino demais.
                  border: `1.5px dashed ${arrastando ? "var(--primary-hover)" : "var(--border)"}`,
                  background: "var(--surface-2)",
                  color: arrastando ? "var(--text-body)" : "var(--text-muted)",
                }}
              >
                <IconSubir size={18} />
                <span>
                  Arraste um arquivo, cole com Ctrl+V
                  <br />
                  ou clique para escolher
                </span>
              </button>
            )}

            <input
              ref={refArquivo}
              type="file"
              className="hidden"
              onChange={(evento) => {
                const escolhido = evento.target.files?.[0];
                if (escolhido) escolherArquivo(escolhido);
                // Zera pra que escolher o MESMO arquivo de novo dispare change.
                evento.target.value = "";
              }}
            />

            {removerAnexo && aula.tem_anexo && (
              <p className="text-text-muted text-[13px]">
                O anexo será removido ao salvar.{" "}
                <button
                  type="button"
                  onClick={() => setRemoverAnexo(false)}
                  className="font-semibold underline"
                  style={{ color: "var(--primary)" }}
                >
                  Desfazer
                </button>
              </p>
            )}
          </div>

          {erro && (
            <p
              role="alert"
              className="rounded-xl px-4 py-3 text-sm font-semibold"
              style={{ background: "var(--danger-bg)", color: "var(--danger-fg)" }}
            >
              {erro}
            </p>
          )}
        </div>

        {/* .editor-rodape: 12px 18px 16px, gap 8px, os DOIS botoes com
            flex:1 — eles dividem a largura em vez de ficarem encostados na
            direita. Numa gaveta estreita isso da alvos de toque grandes. */}
        <div className="border-border-default flex gap-2 border-t px-[18px] pt-3 pb-4">
          <button
            type="button"
            onClick={aoFechar}
            disabled={enviando}
            className="bg-surface-2 border-border-default text-text-body flex-1 rounded-[9px] border p-2.5 text-[12.5px] font-semibold disabled:opacity-40"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void salvar()}
            disabled={enviando}
            className="flex flex-1 items-center justify-center gap-2 rounded-[9px] p-2.5 text-[12.5px] font-semibold transition-opacity disabled:opacity-60"
            style={{ background: "var(--primary)", color: "var(--text-on-brand)" }}
          >
            {enviando && (
              <span
                aria-hidden
                className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current/40 border-t-current"
              />
            )}
            {enviando ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </aside>
    </div>
  );
}
