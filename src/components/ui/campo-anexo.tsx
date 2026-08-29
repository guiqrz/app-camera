"use client";

import { useRef, useState } from "react";

import { IconClipe, IconLink, IconLixeira, IconSubir } from "@/components/ui/icons";

/**
 * Escolha de anexo: UM ARQUIVO OU UM LINK.
 *
 * POR QUE A ESCOLHA VEM ANTES: nem todo material e' arquivo — slide no Drive,
 * video, artigo. Antes, anexar um desses obrigava a baixar pra reenviar. As
 * duas formas ficam lado a lado, e o campo do link so' aparece depois de o
 * professor escolher "link": mostrar os dois ao mesmo tempo faria parecer que
 * ele precisa preencher os dois.
 *
 * O componente nao ENVIA nada. Ele devolve a escolha por `aoEscolher` e quem
 * usa decide quando gravar — o mesmo desenho do resto dos formularios daqui,
 * onde salvar acontece no botao do rodape e nao a cada digito.
 */

export type EscolhaDeAnexo =
  | { tipo: "arquivo"; arquivo: File }
  | { tipo: "link"; url: string; nome: string };

function formatarTamanho(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Espelha ESQUEMAS_DE_LINK em cupcam/gestao/agenda.py. */
function pareceLink(url: string) {
  const limpo = url.trim().toLowerCase();
  return limpo.startsWith("http://") || limpo.startsWith("https://");
}

type Props = {
  /** Tamanho maximo do arquivo, em bytes. */
  maximoBytes: number;
  desabilitado?: boolean;
  /** Chamado quando o professor escolhe um arquivo ou confirma um link. */
  aoEscolher: (escolha: EscolhaDeAnexo) => void;
};

export function CampoAnexo({ maximoBytes, desabilitado = false, aoEscolher }: Props) {
  // null = ainda escolhendo entre as duas formas.
  const [modo, setModo] = useState<"arquivo" | "link" | null>(null);
  const [url, setUrl] = useState("");
  const [nome, setNome] = useState("");
  const [arrastando, setArrastando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const refArquivo = useRef<HTMLInputElement>(null);

  function escolherArquivo(escolhido: File) {
    if (escolhido.size > maximoBytes) {
      setErro(`O arquivo passa de ${formatarTamanho(maximoBytes)}.`);
      return;
    }
    setErro(null);
    aoEscolher({ tipo: "arquivo", arquivo: escolhido });
    setModo(null);
  }

  function confirmarLink() {
    const endereco = url.trim();
    // Mesma regra do backend, aplicada aqui so' pra dar a resposta na hora. A
    // trava que vale continua sendo a do servidor.
    if (!pareceLink(endereco)) {
      setErro("O link precisa começar com http:// ou https://");
      return;
    }
    setErro(null);
    aoEscolher({ tipo: "link", url: endereco, nome: nome.trim() });
    setUrl("");
    setNome("");
    setModo(null);
  }

  if (modo === "link") {
    return (
      <div className="flex flex-col gap-2">
        <input
          value={url}
          onChange={(evento) => setUrl(evento.target.value)}
          onKeyDown={(evento) => {
            // Enter confirma o link em vez de submeter o formulario inteiro:
            // o anexo e' um passo dentro do formulario, nao o fim dele.
            if (evento.key === "Enter") {
              evento.preventDefault();
              confirmarLink();
            }
          }}
          placeholder="https://…"
          aria-label="Endereço do link"
          autoFocus
          disabled={desabilitado}
          className="bg-surface-2 border-border-default text-text placeholder:text-text-muted w-full rounded-[9px] border px-[11px] py-[9px] text-[12.5px] outline-none focus:outline-2 focus:-outline-offset-1 focus:outline-[var(--primary-hover)]"
        />
        <input
          value={nome}
          onChange={(evento) => setNome(evento.target.value)}
          placeholder="Nome (opcional — sem ele, mostramos o site)"
          aria-label="Nome do link"
          disabled={desabilitado}
          className="bg-surface-2 border-border-default text-text placeholder:text-text-muted w-full rounded-[9px] border px-[11px] py-[9px] text-[12.5px] outline-none focus:outline-2 focus:-outline-offset-1 focus:outline-[var(--primary-hover)]"
        />
        {erro && (
          <p className="text-[11.5px]" style={{ color: "var(--danger-fg)" }} role="alert">
            {erro}
          </p>
        )}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={confirmarLink}
            disabled={desabilitado}
            className="rounded-full px-[14px] py-[6px] text-[12px] font-semibold disabled:opacity-50"
            style={{ background: "var(--primary)", color: "var(--text-on-brand)" }}
          >
            Adicionar link
          </button>
          <button
            type="button"
            onClick={() => {
              setModo(null);
              setErro(null);
            }}
            disabled={desabilitado}
            className="text-text-muted hover:text-text rounded-full px-[14px] py-[6px] text-[12px]"
          >
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
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
          disabled={desabilitado}
          className="flex flex-1 flex-col items-center gap-[5px] rounded-[9px] px-3 py-4 text-center text-[11.5px] transition-colors disabled:opacity-50"
          style={{
            // 1.5px cravado: a classe border-[1.5px] do Tailwind sai como
            // 0.8px no computado (resolve em rem e o browser arredonda), e o
            // tracejado fica fino demais.
            border: `1.5px dashed ${arrastando ? "var(--primary-hover)" : "var(--border)"}`,
            background: "var(--surface-2)",
            color: arrastando ? "var(--text-body)" : "var(--text-muted)",
          }}
        >
          <IconSubir size={18} />
          <span>Enviar arquivo</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setModo("link");
            setErro(null);
          }}
          disabled={desabilitado}
          className="flex flex-1 flex-col items-center gap-[5px] rounded-[9px] px-3 py-4 text-center text-[11.5px] transition-colors disabled:opacity-50"
          style={{
            border: "1.5px dashed var(--border)",
            background: "var(--surface-2)",
            color: "var(--text-muted)",
          }}
        >
          <IconLink size={18} />
          <span>Colar um link</span>
        </button>
      </div>

      {erro && (
        <p className="text-[11.5px]" style={{ color: "var(--danger-fg)" }} role="alert">
          {erro}
        </p>
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
    </div>
  );
}

/** Linha de um anexo ja' escolhido ou ja' gravado. */
export function LinhaDeAnexo({
  nome,
  detalhe,
  ehLink,
  href,
  aoRemover,
  desabilitado = false,
}: {
  nome: string;
  detalhe: string;
  ehLink: boolean;
  /** Endereco do link, ou rota de download do arquivo. Ausente = nada a abrir. */
  href?: string;
  aoRemover: () => void;
  desabilitado?: boolean;
}) {
  return (
    <div className="bg-surface border-border-default flex items-center gap-3 rounded-xl border px-3.5 py-3">
      {ehLink ? (
        <IconLink size={16} className="text-text-muted flex-none" />
      ) : (
        <IconClipe size={16} className="text-text-muted flex-none" />
      )}
      <div className="min-w-0 flex-1">
        {href ? (
          <a
            href={href}
            // Link de terceiro abre em outra aba, e `noreferrer` impede que a
            // pagina de destino alcance esta pela window.opener.
            target={ehLink ? "_blank" : undefined}
            rel={ehLink ? "noopener noreferrer" : undefined}
            className="text-text-body hover:text-primary block truncate text-sm"
          >
            {nome}
          </a>
        ) : (
          <p className="text-text-body truncate text-sm">{nome}</p>
        )}
        <p className="text-text-muted text-[11px]">{detalhe}</p>
      </div>
      <button
        type="button"
        onClick={aoRemover}
        disabled={desabilitado}
        className="text-text-muted hover:text-danger flex-none rounded-lg p-1.5 disabled:opacity-40"
        aria-label={`Remover ${nome}`}
      >
        <IconLixeira size={16} />
      </button>
    </div>
  );
}
