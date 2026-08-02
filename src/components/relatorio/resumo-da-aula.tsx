"use client";

import { useState } from "react";

import { TextoFormatado } from "@/components/ia/texto-formatado";
import { IconIA, IconRecomecar } from "@/components/ui/icons";

type ResumoDaAulaProps = {
  sessaoId: number;
};

/**
 * Resumo da aula, gerado quando o professor clica.
 *
 * Vive DENTRO da secao de transcricao, nao num card proprio: e' a versao curta
 * do mesmo texto que esta ali em cima, e um card separado sugeria duas coisas
 * diferentes na tela quando e' uma so'.
 *
 * SOB DEMANDA, e nao no encerramento da aula: resumir toda sessao gastaria uma
 * chamada ao modelo por aula, inclusive nas que ninguem abre — e a maioria nao
 * e' aberta duas vezes.
 *
 * Nao guarda o resultado: sair da tela e voltar gera de novo. Guardar exigiria
 * tabela e decisao sobre invalidar quando a transcricao for reprocessada;
 * enquanto o uso real nao mostrar que vale, o botao resolve.
 */
export function ResumoDaAula({ sessaoId }: ResumoDaAulaProps) {
  const [resumo, setResumo] = useState<string | null>(null);
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const gerar = async () => {
    setGerando(true);
    setErro(null);
    try {
      const r = await fetch(`/api/ia/resumo/${sessaoId}`, { method: "POST" });
      if (!r.ok) {
        const dados = (await r.json().catch(() => null)) as { erro?: string } | null;
        setErro(dados?.erro ?? "Não foi possível gerar o resumo.");
        return;
      }
      const { resumo: texto } = (await r.json()) as { resumo: string; modelo: string };
      setResumo(texto);
    } catch {
      setErro("Não foi possível gerar o resumo. Verifique a conexão.");
    } finally {
      setGerando(false);
    }
  };

  return (
    <>
      {/* Botao da marca, alinhado a' direita na barra de acoes: e' a acao que
          PRODUZ algo (e custa uma chamada ao modelo), diferente de Expandir e
          Copiar, que so' mexem no que ja esta na tela. Por isso ele e' o unico
          preenchido — a cor marca a hierarquia, nao decora. */}
      <button
        type="button"
        onClick={gerar}
        disabled={gerando}
        className="text-text-on-brand ml-auto flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-extrabold transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        style={{ background: "var(--primary)" }}
      >
        {resumo === null || gerando ? (
          <IconIA size={14} />
        ) : (
          <IconRecomecar size={14} />
        )}
        {gerando ? "Resumindo…" : resumo === null ? "Resumir aula" : "Gerar de novo"}
      </button>

      {/* O resultado sai FORA do <button>, abaixo da barra. `order` nao serve
          aqui porque a barra e' flex-wrap: o resumo ocupa a largura inteira, e
          quem posiciona e' o pai (ver SecaoTranscricao). */}
      {(erro !== null || gerando || resumo !== null) && (
        <div className="w-full">
          {erro !== null && (
            <p
              className="text-xs font-semibold"
              style={{ color: "var(--danger-fg)" }}
              role="alert"
            >
              {erro}
            </p>
          )}

          {gerando && (
            <div className="flex items-center gap-2.5" role="status">
              <span className="relative flex h-2.5 w-2.5 shrink-0" aria-hidden>
                <span
                  className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
                  style={{ background: "var(--primary)" }}
                />
                <span
                  className="relative inline-flex h-2.5 w-2.5 rounded-full"
                  style={{ background: "var(--primary)" }}
                />
              </span>
              <span className="text-text-muted text-sm font-semibold">
                Lendo a transcrição…
              </span>
            </div>
          )}

          {resumo !== null && !gerando && erro === null && (
            <div
              className="border-border-default flex flex-col gap-2 rounded-xl border p-4"
              style={{ background: "var(--surface-2)" }}
            >
              <span className="text-text-muted text-xs font-bold tracking-wide uppercase">
                Resumo da aula
              </span>
              {/* Mesmo formatador da conversa: o resumo vem do modelo e pode
                  trazer negrito ou lista. */}
              <div className="text-text-body text-sm leading-relaxed">
                <TextoFormatado texto={resumo} />
              </div>
              <p className="text-text-muted text-xs leading-relaxed">
                Gerado por IA a partir da transcrição automática — confira antes
                de usar como registro da aula.
              </p>
            </div>
          )}
        </div>
      )}
    </>
  );
}
