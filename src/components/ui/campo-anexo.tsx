"use client";

import { useRef, useState } from "react";

import {
  IconBaixar,
  IconClipe,
  IconLink,
  IconLixeira,
  IconSubir,
} from "@/components/ui/icons";

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
  /**
   * Chamado a cada tecla no campo de link, com o que esta' digitado ali AGORA
   * (ou null quando o campo esta' vazio / fechado).
   *
   * POR QUE EXISTE: sem isto, um link digitado mas nao "adicionado" — o
   * professor cola a URL e clica direto em Salvar — some em silencio, porque
   * `aoEscolher` so' dispara no botao "Adicionar link". Quem usa este componente
   * guarda o rascunho e o confirma no proprio salvar. Ver editor-aula.tsx.
   */
  aoMudarRascunhoDeLink?: (rascunho: { url: string; nome: string } | null) => void;
};

export function CampoAnexo({
  maximoBytes,
  desabilitado = false,
  aoEscolher,
  aoMudarRascunhoDeLink,
}: Props) {
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
    aoMudarRascunhoDeLink?.(null);
  }

  /** Atualiza um campo do link e avisa o rascunho pro componente pai. */
  function mexerNoLink(campo: "url" | "nome", valor: string) {
    const proximaUrl = campo === "url" ? valor : url;
    const proximoNome = campo === "nome" ? valor : nome;
    if (campo === "url") setUrl(valor);
    else setNome(valor);
    const urlLimpa = proximaUrl.trim();
    aoMudarRascunhoDeLink?.(
      urlLimpa ? { url: urlLimpa, nome: proximoNome.trim() } : null,
    );
  }

  if (modo === "link") {
    return (
      <div className="flex flex-col gap-2">
        <input
          value={url}
          onChange={(evento) => mexerNoLink("url", evento.target.value)}
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
          onChange={(evento) => mexerNoLink("nome", evento.target.value)}
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
              setUrl("");
              setNome("");
              aoMudarRascunhoDeLink?.(null);
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

/**
 * Linha de um anexo ja' escolhido ou ja' gravado.
 *
 * ACOES, conforme o tipo:
 *  - LINK: um botao "Abrir", que leva ao endereco em outra aba.
 *  - ARQUIVO: "Abrir" (PDF/imagem renderizam numa aba; outros tipos o backend
 *    forca baixar) E "Baixar" (sempre salva o arquivo, com o nome certo).
 *
 * POR QUE OS DOIS pro arquivo: um <a> unico apontando pra rota de download
 * respondia `Content-Disposition: attachment` — o navegador baixava em
 * silencio e a pagina nao ia a lugar nenhum, entao parecia que o clique nao
 * fez nada. Separar deixa claro o que cada acao faz.
 */
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
  /**
   * LINK: o endereco. ARQUIVO: a rota de download da ponte (sem query). De
   * ausente, a linha nao oferece acao (anexo recem-escolhido, ainda sem id).
   */
  href?: string;
  aoRemover: () => void;
  desabilitado?: boolean;
}) {
  // Pro arquivo, "Abrir" pede a mesma rota com ?inline=1: o backend responde
  // inline pros tipos que o navegador renderiza sem risco (PDF, imagem raster)
  // e attachment pro resto.
  const hrefAbrir = href
    ? ehLink
      ? href
      : `${href}${href.includes("?") ? "&" : "?"}inline=1`
    : undefined;

  return (
    <div className="bg-surface border-border-default flex items-center gap-3 rounded-xl border px-3.5 py-3">
      {ehLink ? (
        <IconLink size={16} className="text-text-muted flex-none" />
      ) : (
        <IconClipe size={16} className="text-text-muted flex-none" />
      )}
      <div className="min-w-0 flex-1">
        <p className="text-text-body truncate text-sm">{nome}</p>
        <p className="text-text-muted text-[11px]">{detalhe}</p>
      </div>

      {hrefAbrir && (
        <a
          href={hrefAbrir}
          // `noreferrer` impede que a pagina de destino alcance esta pela
          // window.opener. Vale pro link e pro arquivo aberto na aba.
          target="_blank"
          rel="noopener noreferrer"
          className="text-text-body hover:text-primary flex-none rounded-lg px-2.5 py-1.5 text-[12px] font-semibold"
        >
          Abrir
        </a>
      )}

      {href && !ehLink && (
        <a
          href={href}
          // `download` forca o SAVE-AS com o nome do arquivo, sem navegar. O
          // atributo so' vale em same-origin — e a ponte /api e' same-origin.
          download={nome}
          className="text-text-muted hover:text-text flex-none rounded-lg p-1.5"
          aria-label={`Baixar ${nome}`}
          title="Baixar"
        >
          <IconBaixar size={16} />
        </a>
      )}

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
