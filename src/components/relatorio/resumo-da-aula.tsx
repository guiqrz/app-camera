"use client";

import { useState } from "react";

import { IconIA, IconRecomecar } from "@/components/ui/icons";

type ResumoDaAulaProps = {
  sessaoId: number;
};

/**
 * Resumo da aula, gerado quando o professor clica.
 *
 * SOB DEMANDA, e nao no encerramento da aula: resumir toda sessao gastaria uma
 * chamada ao modelo por aula, inclusive nas que ninguem abre — e a maioria nao
 * e' aberta duas vezes. O custo so' acontece quando alguem quer o resumo.
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
    <div className="border-border-default bg-surface shadow-card flex flex-col gap-4 rounded-2xl border p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span aria-hidden style={{ color: "var(--primary)" }}>
            <IconIA size={20} />
          </span>
          <h2 className="text-text text-lg font-extrabold">Resumo da aula</h2>
        </div>

        {/* Depois de gerar, o botao vira "Gerar de novo" em vez de sumir: a
            transcricao tem erro de reconhecimento, e uma segunda tentativa
            costuma sair melhor. */}
        <button
          type="button"
          onClick={gerar}
          disabled={gerando}
          className="border-border-default text-text hover:bg-surface-2 flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-extrabold transition-colors disabled:cursor-not-allowed disabled:opacity-60"
        >
          {resumo !== null && !gerando && <IconRecomecar size={15} />}
          {gerando ? "Resumindo…" : resumo === null ? "Resumir aula" : "Gerar de novo"}
        </button>
      </div>

      {erro && (
        <p
          className="text-xs font-semibold"
          style={{ color: "var(--danger-fg)" }}
          role="alert"
        >
          {erro}
        </p>
      )}

      {resumo === null && !gerando && erro === null && (
        <p className="text-text-muted text-sm leading-relaxed">
          O assistente lê a transcrição e devolve o conteúdo dado, o que foi
          combinado com a turma e o que ficou em aberto.
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

      {resumo !== null && !gerando && (
        <>
          {/* whitespace-pre-wrap: o resumo vem em tres partes separadas por
              quebra de linha, e sem isto vira um paragrafo unico. */}
          <div className="text-text-body text-sm leading-relaxed whitespace-pre-wrap">
            {resumo}
          </div>
          <p className="text-text-muted text-xs leading-relaxed">
            Gerado por IA a partir da transcrição automática — confira antes de
            usar como registro da aula.
          </p>
        </>
      )}
    </div>
  );
}
