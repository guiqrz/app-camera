"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { ChipAnexo } from "@/components/ia/chip-anexo";
import { CompositorPergunta } from "@/components/ia/compositor-pergunta";
import { ListaConversas } from "@/components/ia/lista-conversas";
import { MascoteCup } from "@/components/ia/mascote-cup";
import { SeletorAula } from "@/components/ia/seletor-aula";
import type { Anexo, Conversa } from "@/lib/types";

/** O ramo de aula da uniao — o unico que a abertura sabe carregar. */
type AnexoDeAula = Extract<Anexo, { tipo: "aula" }>;

/** Quantas conversas aparecem antes de o professor pedir o resto. */
const CONVERSAS_VISIVEIS = 3;

/**
 * Saudacao pela hora do relogio do professor.
 *
 * Roda no navegador de proposito: no servidor sairia o fuso da maquina que
 * hospeda a API, e "Boa noite" as tres da tarde e' o tipo de erro que faz a
 * tela inteira parecer desligada da realidade.
 */
function saudacaoDaHora(): string {
  const hora = new Date().getHours();
  if (hora < 12) return "Bom dia";
  if (hora < 18) return "Boa tarde";
  return "Boa noite";
}

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
 * Abertura do Cup AI: mascote, saudacao, campo de pergunta e as ultimas
 * conversas.
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
  const [mostrarTodas, setMostrarTodas] = useState(false);

  // Aula anexada ANTES de a conversa existir. Vai como `sessao` no endereco,
  // e quem de fato anexa e' a tela da conversa.
  //
  // So' aula, nunca arquivo: um `File` nao cabe numa URL, e guarda-lo aqui
  // exigiria segura-lo ate' a proxima tela montar. Anexar arquivo continua
  // dentro da conversa, onde o envio acontece.
  const [aulaEscolhida, setAulaEscolhida] = useState<AnexoDeAula | null>(null);
  const [seletorAberto, setSeletorAberto] = useState(false);

  // `useState` com funcao: a saudacao e' lida uma vez, na montagem. Recalcular
  // a cada desenho trocaria "Boa tarde" por "Boa noite" no meio do uso.
  const [saudacao] = useState(saudacaoDaHora);

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

  const comecar = async () => {
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
      // junto quando ha aula anexada: a escolhida aqui, ou a que veio do
      // relatorio (`/ia?sessao=`).
      const parametros = new URLSearchParams({ pergunta: texto });
      const sessao = aulaEscolhida?.sessaoId ?? sessaoAnexada;
      if (sessao !== null && sessao !== undefined) {
        parametros.set("sessao", String(sessao));
      }
      router.push(`/ia/${conversa.id}?${parametros}`);
    } catch {
      setErro("Não foi possível começar a conversa. Verifique a conexão.");
    } finally {
      setCriando(false);
    }
  };

  const visiveis = mostrarTodas
    ? conversas
    : conversas.slice(0, CONVERSAS_VISIVEIS);
  const escondidas = conversas.length - CONVERSAS_VISIVEIS;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center">
      {/* Aviso ANTES do campo, nao depois de perguntar: sem chave o backend
          responde 503, e descobrir isso so' depois de escrever um paragrafo
          inteiro seria perder o texto por nada. */}
      {!chaveConfigurada && (
        <p
          className="mb-6 w-full rounded-xl px-4 py-3 text-sm leading-relaxed"
          style={{ background: "var(--warn-bg)", color: "var(--warn-fg)" }}
          role="status"
        >
          O assistente ainda não está configurado no servidor (falta a chave de
          API). As perguntas não serão respondidas até isso ser feito.
        </p>
      )}

      {/* As margens negativas cortam o vao vazio do viewBox: o desenho ocupa
          so' a faixa central, e sem o corte o mascote flutuaria longe do
          titulo, com um bloco de nada no meio. */}
      <span className="-mt-3.5 -mb-[26px]">
        <MascoteCup size={132} animado titulo="Cup, o assistente" />
      </span>

      <h1 className="text-text text-center text-[28px] leading-tight font-semibold tracking-tight sm:text-[34px]" style={{ fontFamily: "var(--font-geologica)" }}>
        {saudacao}, professor.
        <br />
        {/* O gradiente da marca vive so' aqui: e' o maior texto da tela e o
            unico lugar onde a cor carrega identidade em vez de hierarquia. */}
        <span
          className="bg-clip-text text-transparent"
          style={{
            backgroundImage:
              "linear-gradient(92deg, var(--violet-500), var(--cyan-500))",
          }}
        >
          O que vamos ver hoje?
        </span>
      </h1>

      <p className="text-text-muted mt-2 text-center text-sm">
        Pergunte sobre suas aulas, anexe uma prova ou peça um resumo.
      </p>

      {seletorAberto && (
        <SeletorAula
          aoEscolher={(anexo) => {
            setAulaEscolhida(anexo);
            setErro(null);
          }}
          aoFechar={() => setSeletorAberto(false)}
        />
      )}

      <div className="mt-6 w-full">
        <CompositorPergunta
          valor={pergunta}
          aoMudar={setPergunta}
          aoEnviar={comecar}
          ocupado={criando}
          rotuloOcupado="Começando…"
          aria="Sua primeira pergunta"
          anexos={
            aulaEscolhida && (
              <div className="px-4 pt-4">
                <ChipAnexo
                  anexo={aulaEscolhida}
                  aoRemover={() => setAulaEscolhida(null)}
                />
              </div>
            )
          }
          aoAnexarAula={() => setSeletorAberto((aberto) => !aberto)}
          seletorAulaAberto={seletorAberto}
          linhas={2}
        />
      </div>

      {erro && (
        <p
          className="mt-3 w-full text-xs font-semibold"
          style={{ color: "var(--danger-fg)" }}
          role="alert"
        >
          {erro}
        </p>
      )}

      {conversas.length > 0 && (
        <section className="mt-9 w-full">
          <h2 className="text-text-muted mb-3 text-[11.5px] font-extrabold tracking-[0.09em] uppercase">
            Últimas conversas
          </h2>

          <ListaConversas conversas={visiveis} aoApagar={apagar} />

          {escondidas > 0 && (
            <button
              type="button"
              onClick={() => setMostrarTodas((aberto) => !aberto)}
              aria-expanded={mostrarTodas}
              className="border-border-strong text-text-body hover:bg-surface-2 mt-2 w-full rounded-2xl border border-dashed py-2.5 text-xs font-bold transition-colors"
            >
              {mostrarTodas
                ? "Ver menos"
                : `Ver todas as conversas (${conversas.length})`}
            </button>
          )}
        </section>
      )}
    </div>
  );
}
