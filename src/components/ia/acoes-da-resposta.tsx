"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";

import { IconBaixar, IconCopiar, IconSeta } from "@/components/ui/icons";
import { dataDoTimestamp } from "@/lib/format";

/** Quanto tempo o "Copiado!" fica na tela, igual ao diario de classe. */
const MS_DO_AVISO_DE_COPIA = 2000;

/** Formatos que o menu "Baixar" oferece, na ordem em que aparecem. */
const FORMATOS_DE_DOWNLOAD = [
  { id: "md", rotulo: "Markdown" },
  { id: "pptx", rotulo: "PowerPoint" },
  { id: "pdf", rotulo: "PDF" },
] as const;

type FormatoDeDownload = (typeof FORMATOS_DE_DOWNLOAD)[number]["id"];

/**
 * Titulo pra mandar pro exportador: a primeira linha `#` do texto.
 *
 * Mesma logica que o assistente usa pra abrir o material (`# Titulo` no
 * topo) — sem essa linha, manda string vazia e a API cai no proprio padrao
 * ("Material de estudo"), em vez desta tela inventar um nome diferente do
 * que a API decidiria sozinha.
 */
function extrairTitulo(texto: string): string {
  const primeiraLinha = texto.split("\n")[0] ?? "";
  const titulo = primeiraLinha.match(/^#\s+(.+)/)?.[1];
  return titulo?.trim() ?? "";
}

/**
 * Baixa um Blob pelo caminho de object URL: cria, clica, revoga.
 *
 * Extraido pra ser reusado pelos tres formatos — o Markdown ja usava esse
 * caminho (validado no navegador real em 07/08), e PowerPoint/PDF entram
 * nele tambem em vez de reinventar o download.
 */
function baixarBlob(blob: Blob, nomeArquivo: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = nomeArquivo;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Sem o revoke o blob fica vivo ate' a aba fechar. Numa conversa longa,
  // baixar varios materiais seguraria todos eles na memoria.
  URL.revokeObjectURL(url);
}

type AcoesDaRespostaProps = {
  /** O texto CRU da mensagem — o mesmo que o formatador desenha na tela. */
  texto: string;
  /** `criada_em` da mensagem; vira a data no nome do arquivo baixado. */
  criadaEm: string;
};

/**
 * Copiar e baixar, embaixo de uma resposta do Cup AI.
 *
 * Existe pra feature E (material pro aluno): o professor pede um resumo das
 * ultimas aulas e precisa TIRAR aquilo do chat pra levar pro aluno. Sem isso
 * ele seleciona o texto com o mouse, e material longo com titulo e lista quase
 * nunca sobrevive a essa selecao inteiro.
 *
 * O que sai daqui e' o texto CRU da mensagem, nao o HTML desenhado por
 * `TextoFormatado`: o que ele cola no Word ou manda no grupo tem que ser o
 * mesmo `**negrito**` e `- lista` que o modelo escreveu, e nao um <strong> que
 * so' faz sentido dentro desta tela.
 *
 * "Baixar" virou um menu com tres formatos (08/08, fatia 2 da feature). O
 * Markdown continua 100% no navegador, sem rota nova, pelo mesmo motivo de
 * antes — e' o texto cru, instantaneo, funciona offline. PowerPoint e PDF SAO
 * a rota nova: o Gemini nao escreve `.pptx`/PDF, entao a conversao acontece
 * no servidor do CUPCAM (`POST /ia/exportar`) e so' a ponte em
 * `app/api/ia/exportar` pode chamar `lib/api.ts` — este componente e'
 * "use client" e `api.ts` quebraria o build se fosse importado aqui (a chave
 * da API e' variavel de servidor).
 */
export function AcoesDaResposta({ texto, criadaEm }: AcoesDaRespostaProps) {
  const [copiado, setCopiado] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [menuAberto, setMenuAberto] = useState(false);
  // Guarda QUAL formato esta gerando, nao so' um booleano: o rotulo do item
  // clicado precisa virar "Gerando…", os outros dois continuam com o nome
  // deles (so' desabilitados) — sem isso o professor nao sabe qual dos tres
  // ele pediu.
  const [gerando, setGerando] = useState<FormatoDeDownload | null>(null);

  const idMenu = useId();
  const menuRef = useRef<HTMLDivElement>(null);

  // O timeout do "Copiado!" precisa morrer junto com o componente: a conversa
  // troca de tela e o setState cairia num componente ja' desmontado.
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) clearTimeout(timeoutRef.current);
    };
  }, []);

  // Fecha ao clicar fora ou apertar Escape — so' registra os listeners
  // globais enquanto o menu esta' aberto, mesmo padrao do balao de ajuda.
  useEffect(() => {
    if (!menuAberto) return;

    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === "Escape") setMenuAberto(false);
    }
    function aoApontar(evento: PointerEvent) {
      if (!menuRef.current?.contains(evento.target as Node)) setMenuAberto(false);
    }

    document.addEventListener("keydown", aoTeclar);
    document.addEventListener("pointerdown", aoApontar);
    return () => {
      document.removeEventListener("keydown", aoTeclar);
      document.removeEventListener("pointerdown", aoApontar);
    };
  }, [menuAberto]);

  const copiar = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setAviso(null);
      if (timeoutRef.current !== null) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setCopiado(false), MS_DO_AVISO_DE_COPIA);
    } catch {
      // navigator.clipboard falha fora de HTTPS e quando o navegador nega a
      // permissao — mesmo tratamento do diario de classe. O texto continua na
      // tela e selecionavel, e o aviso diz isso em vez de deixar o professor
      // achando que o botao quebrou.
      setAviso("Não foi possível copiar. Selecione o texto acima e copie manualmente.");
    }
  }, [texto]);

  const baixarMarkdown = useCallback(() => {
    // Blob com charset explicito: sem ele, acento vira caractere quebrado ao
    // abrir o arquivo em editor que assume a codificacao do sistema.
    const blob = new Blob([texto], { type: "text/markdown;charset=utf-8" });
    baixarBlob(blob, `material-${dataDoTimestamp(criadaEm)}.md`);
  }, [texto, criadaEm]);

  const baixarPeloServidor = useCallback(
    async (formato: "pdf" | "pptx") => {
      setGerando(formato);
      setAviso(null);
      try {
        const resposta = await fetch("/api/ia/exportar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ texto, formato, titulo: extrairTitulo(texto) }),
        });
        if (!resposta.ok) {
          const corpo = (await resposta.json().catch(() => null)) as
            | { erro?: string }
            | null;
          throw new Error(corpo?.erro ?? "Não foi possível gerar o arquivo. Tente de novo.");
        }
        const blob = await resposta.blob();
        baixarBlob(blob, `material-${dataDoTimestamp(criadaEm)}.${formato}`);
      } catch (erro) {
        setAviso(erro instanceof Error ? erro.message : "Não foi possível gerar o arquivo. Tente de novo.");
      } finally {
        setGerando(null);
      }
    },
    [texto, criadaEm],
  );

  const escolherFormato = useCallback(
    (formato: FormatoDeDownload) => {
      setMenuAberto(false);
      if (formato === "md") {
        baixarMarkdown();
      } else {
        void baixarPeloServidor(formato);
      }
    },
    [baixarMarkdown, baixarPeloServidor],
  );

  return (
    <div className="mt-2 flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-1.5">
        <BotaoDeAcao onClick={copiar} rotulo={copiado ? "Copiado!" : "Copiar"}>
          <IconCopiar size={13} />
        </BotaoDeAcao>

        <div ref={menuRef} className="relative">
          <button
            type="button"
            onClick={() => setMenuAberto((estava) => !estava)}
            aria-haspopup="menu"
            aria-expanded={menuAberto}
            aria-controls={idMenu}
            disabled={gerando !== null}
            className="text-text-muted hover:text-text flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-bold transition-colors hover:bg-[var(--surface-2)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span aria-hidden>
              <IconBaixar size={13} />
            </span>
            {gerando !== null ? "Gerando…" : "Baixar"}
            <span aria-hidden className="-ml-0.5">
              <IconSeta size={10} />
            </span>
          </button>

          {menuAberto && (
            <div
              id={idMenu}
              role="menu"
              className="absolute left-0 z-20 mt-1 min-w-[9.5rem] rounded-xl border p-1 text-xs shadow-lg"
              style={{ borderColor: "var(--border)", background: "var(--surface)" }}
            >
              {FORMATOS_DE_DOWNLOAD.map((opcao) => (
                <button
                  key={opcao.id}
                  type="button"
                  role="menuitem"
                  disabled={gerando !== null}
                  onClick={() => escolherFormato(opcao.id)}
                  className="text-text hover:bg-[var(--surface-2)] flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {gerando === opcao.id ? "Gerando…" : opcao.rotulo}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* role="status" pro leitor de tela anunciar o "Copiado!" e o aviso de
          erro — sem isso, quem nao ve a mudanca de rotulo nao sabe se a copia
          funcionou. */}
      <p role="status" className="sr-only">
        {copiado ? "Texto copiado." : ""}
      </p>

      {aviso !== null && (
        <p
          className="text-[11px] font-semibold"
          style={{ color: "var(--warn-fg)" }}
          role="alert"
        >
          {aviso}
        </p>
      )}
    </div>
  );
}

type BotaoDeAcaoProps = {
  onClick: () => void;
  rotulo: string;
  children: React.ReactNode;
};

/**
 * Botao discreto de acao, com icone e texto.
 *
 * Discreto de proposito: estas acoes acompanham TODA resposta do assistente, e
 * um par de botoes cheios embaixo de cada uma competiria com o proprio texto
 * pela atencao — a resposta e' o conteudo, o botao e' ferramenta.
 */
function BotaoDeAcao({ onClick, rotulo, children }: BotaoDeAcaoProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-text-muted hover:text-text flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-bold transition-colors hover:bg-[var(--surface-2)]"
    >
      <span aria-hidden>{children}</span>
      {rotulo}
    </button>
  );
}
