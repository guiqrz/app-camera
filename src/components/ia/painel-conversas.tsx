"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { ListaConversas } from "@/components/ia/lista-conversas";
import type { Conversa } from "@/lib/types";

type PainelConversasProps = {
  conversasIniciais: Conversa[];
  /** Sem chave de API no servidor o assistente nao responde — ver `avisoSemChave`. */
  chaveConfigurada: boolean;
  /**
   * Aula que o professor trouxe do relatorio (`/ia?sessao=`), pra ja' entrar
   * anexada na conversa nova. Null na entrada normal, pela sidebar.
   */
  sessaoAnexada: number | null;
};

/**
 * Tela de lista do Cup AI: conversas existentes e o campo que comeca uma nova.
 *
 * Comecar uma conversa sao DUAS chamadas, nesta ordem: `POST /ia/conversas`
 * cria e usa a pergunta como titulo, e so' entao a pergunta e' de fato enviada
 * pela tela da conversa. Por isso aqui navega-se pra /ia/{id} passando a
 * pergunta pendente — quem responde e' a tela de la'.
 */
export function PainelConversas({
  conversasIniciais,
  chaveConfigurada,
  sessaoAnexada,
}: PainelConversasProps) {
  const router = useRouter();
  const [conversas, setConversas] = useState(conversasIniciais);
  const [pergunta, setPergunta] = useState("");
  const [criando, setCriando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const apagar = async (conversaId: number) => {
    setErro(null);
    try {
      const r = await fetch(`/api/ia/conversas/${conversaId}`, { method: "DELETE" });
      // 404 conta como sucesso: a conversa ja' nao existe, que e' o que o
      // professor pediu. Insistir num erro aqui seria discutir com o resultado.
      if (!r.ok && r.status !== 404) {
        const dados = (await r.json().catch(() => null)) as { erro?: string } | null;
        setErro(dados?.erro ?? "Não foi possível apagar a conversa.");
        return;
      }
      setConversas((anteriores) => anteriores.filter((c) => c.id !== conversaId));
    } catch {
      setErro("Não foi possível apagar a conversa. Verifique a conexão.");
    }
  };

  const comecar = async (evento: React.FormEvent) => {
    evento.preventDefault();

    const texto = pergunta.trim();
    if (!texto || criando) return;

    setErro(null);
    setCriando(true);
    try {
      const r = await fetch("/api/ia/conversas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ primeira_pergunta: texto }),
      });

      if (!r.ok) {
        const dados = (await r.json().catch(() => null)) as { erro?: string } | null;
        // O texto fica no campo: a conversa nem chegou a existir.
        setErro(dados?.erro ?? "Não foi possível começar a conversa.");
        return;
      }

      const conversa = (await r.json()) as Conversa;
      // A pergunta viaja no endereco pra tela da conversa envia-la sozinha —
      // sem isso o professor digitaria a mesma coisa duas vezes. `sessao` vai
      // junto quando ele veio do relatorio, pra aula ja' entrar anexada.
      const parametros = new URLSearchParams({ pergunta: texto });
      if (sessaoAnexada !== null) {
        parametros.set("sessao", String(sessaoAnexada));
      }
      router.push(`/ia/${conversa.id}?${parametros}`);
    } catch {
      setErro("Não foi possível começar a conversa. Verifique a conexão.");
    } finally {
      setCriando(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      {/* Aviso ANTES do campo, nao depois de perguntar: sem chave o backend
          responde 503, e descobrir isso so' depois de escrever um paragrafo
          inteiro seria perder o texto por nada. */}
      {!chaveConfigurada && (
        <p
          className="rounded-xl px-4 py-3 text-sm leading-relaxed"
          style={{ background: "var(--warn-bg)", color: "var(--warn-fg)" }}
          role="status"
        >
          O assistente ainda não está configurado no servidor (falta a chave de
          API). As perguntas não serão respondidas até isso ser feito.
        </p>
      )}

      <form onSubmit={comecar} className="flex flex-col gap-2">
        <label htmlFor="primeira-pergunta" className="text-text text-sm font-extrabold">
          Nova conversa
        </label>
        <textarea
          id="primeira-pergunta"
          value={pergunta}
          onChange={(evento) => setPergunta(evento.target.value)}
          onKeyDown={(evento) => {
            if (evento.key === "Enter" && !evento.shiftKey) {
              evento.preventDefault();
              comecar(evento);
            }
          }}
          rows={3}
          placeholder="Pergunte sobre suas aulas…"
          disabled={criando}
          className="border-border-default bg-surface text-text-body focus:border-primary w-full resize-y rounded-xl border px-4 py-3 text-sm leading-relaxed outline-none disabled:cursor-not-allowed disabled:opacity-60"
        />
        <div className="flex items-center justify-between gap-3">
          <span className="text-text-muted text-xs">
            Enter envia · Shift+Enter quebra linha
          </span>
          <button
            type="submit"
            disabled={criando || !pergunta.trim()}
            className="text-text-on-brand rounded-xl px-5 py-2.5 text-sm font-extrabold transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
            style={{ background: "var(--primary)" }}
          >
            {criando ? "Começando…" : "Começar conversa"}
          </button>
        </div>
      </form>

      {erro && (
        <p
          className="text-xs font-semibold"
          style={{ color: "var(--danger-fg)" }}
          role="alert"
        >
          {erro}
        </p>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-text text-sm font-extrabold">Conversas anteriores</h2>
        <ListaConversas conversas={conversas} aoApagar={apagar} />
      </section>
    </div>
  );
}
