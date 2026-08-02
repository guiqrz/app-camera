"use client";

import { useRef, type ReactNode } from "react";

import { IconCalendario, IconFoto } from "@/components/ui/icons";

/**
 * Faisca do assistente, a' esquerda do campo.
 *
 * Fica aqui e nao em `icons.tsx` porque e' o unico icone do app pintado com o
 * gradiente da marca em vez de `currentColor` — a regra de la' e' herdar a cor
 * do texto, e abrir excecao no arquivo compartilhado confundiria quem o usa
 * depois.
 */
function Faisca() {
  return (
    <svg
      width={17}
      height={17}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      focusable={false}
      className="mt-0.5 flex-none"
    >
      <defs>
        <linearGradient id="faisca-cup" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="var(--violet-400)" />
          <stop offset="100%" stopColor="var(--cyan-500)" />
        </linearGradient>
      </defs>
      <path
        d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z"
        stroke="url(#faisca-cup)"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M18.5 15.5l.9 2.3 2.3.9-2.3.9-.9 2.3-.9-2.3-2.3-.9 2.3-.9z"
        stroke="url(#faisca-cup)"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type CompositorPerguntaProps = {
  valor: string;
  aoMudar: (texto: string) => void;
  /** Chamado no Enter e no clique do botao. Quem chama valida e envia. */
  aoEnviar: () => void;
  /** Trava o campo e os botoes enquanto a resposta nao chega. */
  ocupado?: boolean;
  /** Texto do botao enquanto ocupado ("Enviando…", "Começando…"). */
  rotuloOcupado?: string;
  placeholder?: string;
  /** Rotulo do campo para leitor de tela. */
  aria?: string;
  /** Chips dos anexos ja' escolhidos, acima do campo. */
  anexos?: ReactNode;
  aoAnexarAula?: () => void;
  aoAnexarArquivos?: (lista: FileList | null) => void;
  /** Formatos aceitos no seletor de arquivo (o `accept` do input). */
  formatosAceitos?: readonly string[];
  /** `true` quando o seletor de aula esta aberto, para o aria-expanded. */
  seletorAulaAberto?: boolean;
  linhas?: number;
};

/**
 * O bloco de escrever a pergunta: campo, anexos e acoes numa caixa so'.
 *
 * Compartilhado pela abertura (`/ia`) e pela conversa (`/ia/[id]`) — as duas
 * telas mostram o mesmo controle, e mante-lo em dois lugares faria uma delas
 * ficar para tras na proxima mudanca.
 *
 * O `<textarea>` some visualmente dentro da caixa (sem borda, sem fundo): a
 * borda e' da caixa inteira, para o conjunto campo + botoes parecer um
 * controle unico, e nao um formulario com um campo dentro.
 */
export function CompositorPergunta({
  valor,
  aoMudar,
  aoEnviar,
  ocupado = false,
  rotuloOcupado = "Enviando…",
  placeholder = "Pergunte sobre suas aulas…",
  aria = "Sua pergunta",
  anexos,
  aoAnexarAula,
  aoAnexarArquivos,
  formatosAceitos,
  seletorAulaAberto,
  linhas = 2,
}: CompositorPerguntaProps) {
  const campoDeArquivo = useRef<HTMLInputElement>(null);

  const vazio = !valor.trim();

  return (
    <div className="border-border-default bg-surface w-full overflow-hidden rounded-2xl border shadow-[0_6px_22px_rgba(28,24,44,0.07)]">
      {anexos}

      <div className="flex gap-2.5 px-4 pt-4 pb-1">
        <Faisca />

        {/* Enter envia, Shift+Enter quebra linha: o professor escreve perguntas
            de varias linhas, e obrigar o clique tiraria a mao do teclado a
            cada pergunta. */}
        <textarea
          value={valor}
          onChange={(evento) => aoMudar(evento.target.value)}
          onKeyDown={(evento) => {
            if (evento.key === "Enter" && !evento.shiftKey) {
              evento.preventDefault();
              if (!vazio && !ocupado) aoEnviar();
            }
          }}
          rows={linhas}
          placeholder={placeholder}
          aria-label={aria}
          disabled={ocupado}
          className="text-text-body placeholder:text-text-muted w-full flex-1 resize-none border-0 bg-transparent text-sm leading-relaxed outline-none disabled:cursor-not-allowed disabled:opacity-60"
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 px-3 pt-2.5 pb-3">
        <div className="flex flex-wrap items-center gap-2">
          {aoAnexarAula && (
            <button
              type="button"
              onClick={aoAnexarAula}
              disabled={ocupado}
              aria-expanded={seletorAulaAberto}
              className="border-border-default text-text-body hover:bg-surface-2 flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-60"
            >
              <IconCalendario size={14} />
              Anexar aula
            </button>
          )}

          {aoAnexarArquivos && (
            <>
              <button
                type="button"
                onClick={() => campoDeArquivo.current?.click()}
                disabled={ocupado}
                className="border-border-default text-text-body hover:bg-surface-2 flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-60"
              >
                <IconFoto size={14} />
                Anexar arquivo
              </button>

              {/* O input nativo fica escondido: o visual dele nao combina com o
                  resto e nao aceita estilo. O botao acima o aciona. */}
              <input
                ref={campoDeArquivo}
                type="file"
                multiple
                accept={formatosAceitos?.join(",")}
                onChange={(evento) => {
                  aoAnexarArquivos(evento.target.files);
                  // Limpa para reanexar o MESMO arquivo depois de remove-lo:
                  // sem isso o `change` nao dispara na segunda escolha.
                  if (campoDeArquivo.current) campoDeArquivo.current.value = "";
                }}
                className="hidden"
                tabIndex={-1}
              />
            </>
          )}
        </div>

        <div className="flex items-center gap-2.5">
          <span className="text-text-muted hidden text-xs sm:inline">
            Enter envia
          </span>
          <button
            type="button"
            onClick={aoEnviar}
            disabled={ocupado || vazio}
            aria-label={ocupado ? rotuloOcupado : "Perguntar"}
            className="text-text-on-brand grid h-9 w-9 flex-none place-items-center rounded-xl transition-opacity disabled:cursor-not-allowed disabled:opacity-35"
            style={{ background: "var(--primary)" }}
          >
            <svg
              width={16}
              height={16}
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden
              focusable={false}
            >
              <path
                d="M12 19V5M5 12l7-7 7 7"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
