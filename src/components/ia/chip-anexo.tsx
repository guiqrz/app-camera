"use client";

import { useEffect, useMemo } from "react";

import { IconCalendario, IconFechar } from "@/components/ui/icons";
import type { Anexo } from "@/lib/types";

/** Peso do arquivo em linguagem de gente ("2,4 MB"). */
function formatarPeso(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toLocaleString("pt-BR", {
    maximumFractionDigits: 1,
  })} MB`;
}

/**
 * Extensao em caixa alta para o selo ("PDF", "TXT").
 *
 * Cai no MIME quando o nome nao tem extensao, e em "DOC" quando nem isso —
 * um selo vazio pareceria erro de renderizacao.
 */
function extensaoDe(arquivo: File): string {
  const doNome = /\.([a-z0-9]+)$/i.exec(arquivo.name)?.[1];
  if (doNome) return doNome.slice(0, 4).toUpperCase();

  const doTipo = arquivo.type.split("/")[1];
  return doTipo ? doTipo.slice(0, 4).toUpperCase() : "DOC";
}

/**
 * Miniatura da imagem anexada.
 *
 * `URL.createObjectURL` em vez de FileReader: nao le o arquivo inteiro para a
 * memoria, so' aponta pra ele. O `revoke` na limpeza e' obrigatorio — sem
 * ele cada anexo escolhido vaza um blob que so' sai no refresh da pagina.
 */
function MiniaturaImagem({ arquivo, lado }: { arquivo: File; lado: number }) {
  // `useMemo` e nao `useState`+efeito: a URL e' derivada do arquivo e existe
  // ja' no primeiro desenho, sem o quadro intermediario em branco que o
  // efeito criaria. O efeito abaixo cuida so' de devolver a memoria.
  const url = useMemo(() => URL.createObjectURL(arquivo), [arquivo]);

  useEffect(() => () => URL.revokeObjectURL(url), [url]);

  /* O next/image otimiza no servidor, que nunca ve este arquivo: o blob so'
     existe neste navegador, nesta sessao. Aqui o <img> nativo e' o certo. */
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt=""
      className="border-border-default block flex-none rounded-lg border object-cover"
      style={{ width: lado, height: lado }}
    />
  );
}

/** Selo colorido com a extensao, para o que nao e' imagem. */
function SeloArquivo({ arquivo, lado }: { arquivo: File; lado: number }) {
  const ehPdf = arquivo.type === "application/pdf";

  return (
    <span
      className="grid flex-none place-items-center rounded-lg text-[9px] font-semibold"
      style={{
        width: lado,
        height: lado,
        // PDF em vermelho porque e' a convencao que todo mundo reconhece;
        // o resto fica neutro pra nao inventar codigo de cor novo.
        background: ehPdf ? "var(--danger-bg)" : "var(--surface-2)",
        color: ehPdf ? "var(--danger-fg)" : "var(--text-muted)",
      }}
      aria-hidden
    >
      {extensaoDe(arquivo)}
    </span>
  );
}

type ChipAnexoProps = {
  anexo: Anexo;
  /** Ausente nas mensagens ja' enviadas, onde nao ha o que remover. */
  aoRemover?: () => void;
};

/**
 * Um anexo escolhido: aula, arquivo ou imagem.
 *
 * Imagem mostra a propria miniatura, e o resto mostra um selo com a extensao —
 * reconhecer "a foto do quadro" pelo nome do arquivo e' mais lento do que
 * reconhecer pela imagem, e o professor costuma anexar varias de uma vez.
 *
 * A aula usa a cor da materia (`--materia-*`), a mesma da grade e da lista de
 * turmas: o anexo passa a ser lido como "aquela aula de Ciencias", e nao como
 * mais um chip cinza.
 */
export function ChipAnexo({ anexo, aoRemover }: ChipAnexoProps) {
  if (anexo.tipo === "aula") {
    return (
      <span className="border-border-default bg-surface shadow-card flex max-w-full items-center gap-2 rounded-xl border py-1.5 pr-1.5 pl-2.5">
        <IconCalendario size={13} className="text-text-muted flex-none" />
        <span className="text-text truncate text-xs font-semibold">
          {anexo.rotulo}
        </span>
        {aoRemover && <BotaoRemover rotulo={anexo.rotulo} aoRemover={aoRemover} />}
      </span>
    );
  }

  const { arquivo } = anexo;
  const ehImagem = arquivo.type.startsWith("image/");

  return (
    <span className="border-border-default bg-surface shadow-card flex max-w-full items-center gap-2 rounded-xl border p-1.5">
      {ehImagem ? (
        <MiniaturaImagem arquivo={arquivo} lado={30} />
      ) : (
        <SeloArquivo arquivo={arquivo} lado={30} />
      )}

      <span className="min-w-0">
        <span className="text-text block max-w-[130px] truncate text-xs font-semibold">
          {arquivo.name}
        </span>
        <span className="text-text-muted text-[10.5px]">
          {formatarPeso(arquivo.size)}
        </span>
      </span>

      {aoRemover && <BotaoRemover rotulo={arquivo.name} aoRemover={aoRemover} />}
    </span>
  );
}

function BotaoRemover({
  rotulo,
  aoRemover,
}: {
  rotulo: string;
  aoRemover: () => void;
}) {
  return (
    <button
      type="button"
      onClick={aoRemover}
      className="text-text-muted hover:bg-surface-2 hover:text-text grid flex-none place-items-center rounded-md p-1 transition-colors"
      aria-label={`Remover ${rotulo}`}
    >
      <IconFechar size={13} />
    </button>
  );
}
