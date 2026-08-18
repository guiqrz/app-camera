"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

import { BotaoMicrofone } from "@/components/ia/botao-microfone";
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
          <stop offset="0%" stopColor="var(--brand-aro-1)" />
          <stop offset="100%" stopColor="var(--brand-aro-2)" />
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
  /**
   * Acesso ao `<textarea>` para quem precisa mexer no foco ou no cursor — os
   * cartoes de sugestao preenchem o campo e param o cursor no meio do texto.
   * Um ref, e nao `document.getElementById`: a tela da conversa e a abertura
   * usam o mesmo compositor, e um id fixo colidiria se as duas coexistissem.
   */
  campoRef?: React.RefObject<HTMLTextAreaElement | null>;
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
  campoRef,
}: CompositorPerguntaProps) {
  const campoDeArquivo = useRef<HTMLInputElement>(null);
  const [arrastando, setArrastando] = useState(false);

  // Espelho de `valor` para o ditado por voz — ver o comentario no
  // <BotaoMicrofone>. Atualizado em efeito porque escrever num ref durante o
  // render e' proibido.
  const valorAgora = useRef(valor);
  useEffect(() => {
    valorAgora.current = valor;
  }, [valor]);

  const vazio = !valor.trim();

  /**
   * Solta o arquivo arrastado de fora do navegador.
   *
   * `preventDefault` obrigatorio: sem ele o navegador ABRE o arquivo solto,
   * trocando a pagina do professor por um PDF em tela cheia.
   */
  const aoSoltar = (evento: React.DragEvent) => {
    evento.preventDefault();
    setArrastando(false);
    if (!aoAnexarArquivos || ocupado) return;

    const arquivos = evento.dataTransfer?.files;
    if (arquivos && arquivos.length > 0) aoAnexarArquivos(arquivos);
  };

  /**
   * Cola imagem da area de transferencia (Ctrl+V).
   *
   * So' age quando ha ARQUIVO no clipboard — colar texto continua colando
   * texto. E' o caso do print de tela, que nao existe como arquivo em disco e
   * de outro jeito exigiria salvar antes pra so' entao anexar.
   *
   * O `preventDefault` fica dentro do `if`: fora dele, colar um trecho de
   * texto normal deixaria de funcionar.
   */
  const aoColar = (evento: React.ClipboardEvent) => {
    if (!aoAnexarArquivos || ocupado) return;

    const arquivos = evento.clipboardData?.files;
    if (arquivos && arquivos.length > 0) {
      evento.preventDefault();
      aoAnexarArquivos(arquivos);
    }
  };

  return (
    // O foco acende a CAIXA (`focus-within`) em vez de pintar um anel no
    // <textarea>: o campo nao tem borda propria, entao o contorno caia no meio
    // do bloco, riscando o texto. A pista continua existindo pra quem navega
    // por teclado — ver tambem `data-campo-sem-anel` em globals.css.
    <div
      onDragOver={(evento) => {
        // Sem isto o navegador recusa o "soltar" e abre o arquivo por conta.
        if (!aoAnexarArquivos || ocupado) return;
        evento.preventDefault();
        // `dragover` dispara sem parar enquanto o ponteiro se move; so' marca
        // na primeira vez.
        if (!arrastando) setArrastando(true);
      }}
      onDragLeave={(evento) => {
        // So' apaga o destaque quando o ponteiro sai da CAIXA — sem esta
        // checagem, passar por cima de um botao interno ja' o desligava.
        if (!evento.currentTarget.contains(evento.relatedTarget as Node)) {
          setArrastando(false);
        }
      }}
      onDrop={aoSoltar}
      onPaste={aoColar}
      // `focus-within` FORA do ternario: dentro do ramo do arrasto, quem navega
      // por teclado ficava sem nenhuma pista de foco enquanto um arquivo era
      // arrastado — e o anel do <textarea> esta desligado.
      className={`bg-surface focus-within:border-primary w-full overflow-hidden rounded-2xl border shadow-[0_6px_22px_rgba(28,24,44,0.07)] transition-colors ${
        arrastando ? "border-primary border-dashed" : "border-border-default"
      }`}
    >
      {/* Aviso durante o arrasto: sem ele o professor nao sabe se a caixa
          aceita o arquivo, e a borda tracejada sozinha e' pista fraca. */}
      {arrastando && (
        <p
          className="text-text-on-brand px-4 py-2 text-center text-xs font-semibold"
          style={{ background: "var(--primary)" }}
          role="status"
        >
          Solte o arquivo para anexar
        </p>
      )}

      {anexos}

      <div className="flex gap-2.5 px-4 pt-4 pb-1">
        <Faisca />

        {/* Enter envia, Shift+Enter quebra linha: o professor escreve perguntas
            de varias linhas, e obrigar o clique tiraria a mao do teclado a
            cada pergunta. */}
        <textarea
          ref={campoRef}
          // Ver globals.css: o anel de foco fica na caixa, nao no campo.
          data-campo-sem-anel
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
              className="border-border-default text-text-body hover:bg-surface-2 flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60"
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
                className="border-border-default text-text-body hover:bg-surface-2 flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60"
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

        <div className="flex items-center gap-2">
          <span className="text-text-muted mr-0.5 hidden text-xs sm:inline">
            Enter envia
          </span>

          {/* O ditado ACRESCENTA ao que ja' esta escrito, com um espaco entre
              as falas: sobrescrever apagaria o que o professor digitou antes
              de decidir falar o resto.

              Le' do ref, e nao de `valor`: o motor de voz guarda esta funcao
              no `onresult` uma unica vez, entao um `valor` capturado aqui
              ficaria congelado no texto de quando o microfone ligou — cada
              trecho ditado sobrescreveria o anterior. */}
          <BotaoMicrofone
            desabilitado={ocupado}
            aoTranscrever={(texto) => {
              const atual = valorAgora.current;
              aoMudar(atual ? `${atual.trimEnd()} ${texto}` : texto);
            }}
          />

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
