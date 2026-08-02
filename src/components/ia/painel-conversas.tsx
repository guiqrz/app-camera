"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  BarraAnexos,
  FORMATOS_ACEITOS,
  validarArquivo,
} from "@/components/ia/barra-anexos";
import { CompositorPergunta } from "@/components/ia/compositor-pergunta";
import { ListaConversas } from "@/components/ia/lista-conversas";
import { MascoteCup } from "@/components/ia/mascote-cup";
import { SeletorAula } from "@/components/ia/seletor-aula";
import { guardarAnexosPendentes } from "@/lib/anexos-pendentes";
import type { Anexo, Conversa } from "@/lib/types";

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

  // Anexos escolhidos ANTES de a conversa existir. Quem de fato os envia e' a
  // tela da conversa: a aula viaja como `sessao` no endereco, e os arquivos
  // pelo modulo de pendentes — `File` nao cabe numa URL.
  const [anexos, setAnexos] = useState<Anexo[]>([]);
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

      // Os arquivos ficam em memoria ate' a proxima tela monta-los: o
      // `router.push` navega no cliente, sem recarregar a pagina.
      const arquivos = anexos.filter((anexo) => anexo.tipo === "arquivo");
      if (arquivos.length > 0) guardarAnexosPendentes(arquivos);

      // A pergunta viaja no endereco pra tela da conversa envia-la sozinha —
      // sem isso o professor digitaria a mesma coisa duas vezes. `sessao` vai
      // junto quando ha aula anexada: a escolhida aqui, ou a que veio do
      // relatorio (`/ia?sessao=`).
      const parametros = new URLSearchParams({ pergunta: texto });
      const aula = anexos.find((anexo) => anexo.tipo === "aula");
      const sessao = aula?.sessaoId ?? sessaoAnexada;
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

  /** Mesma validacao da tela da conversa — ver `validarArquivo`. */
  const anexarArquivos = (lista: FileList | null) => {
    if (!lista || lista.length === 0) return;

    const aceitos: Anexo[] = [];
    const recusados: string[] = [];
    for (const arquivo of Array.from(lista)) {
      // Os aceitos deste mesmo lote entram na conta do limite de corpo: sem
      // isso, tres arquivos de 10 MB escolhidos de uma vez passariam juntos.
      const motivo = validarArquivo(arquivo, [...anexos, ...aceitos]);
      if (motivo) recusados.push(motivo);
      else aceitos.push({ tipo: "arquivo", arquivo });
    }

    if (aceitos.length > 0) setAnexos((anteriores) => [...anteriores, ...aceitos]);
    setErro(recusados.length > 0 ? recusados.join(" ") : null);
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
      <span className="-mt-4 -mb-[26px]">
        <MascoteCup size={126} animado titulo="Cup, o assistente" />
      </span>

      <h1 className="text-text text-center text-[27px] leading-tight font-semibold tracking-tight sm:text-[33px]" style={{ fontFamily: "var(--font-geologica)" }}>
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
        <div className="mt-5 w-full">
          <SeletorAula
            aoEscolher={(anexo) => {
              // Mesma aula duas vezes mandaria a transcricao repetida pro
              // modelo e dobraria o contexto sem acrescentar nada.
              setAnexos((anteriores) =>
                anteriores.some(
                  (a) => a.tipo === "aula" && a.sessaoId === anexo.sessaoId,
                )
                  ? anteriores
                  : [...anteriores, anexo],
              );
              setErro(null);
            }}
            aoFechar={() => setSeletorAberto(false)}
          />
        </div>
      )}

      <div className="mt-7 w-full">
        <CompositorPergunta
          valor={pergunta}
          aoMudar={setPergunta}
          aoEnviar={comecar}
          ocupado={criando}
          rotuloOcupado="Começando…"
          aria="Sua primeira pergunta"
          anexos={
            <BarraAnexos
              anexos={anexos}
              aoRemover={(indice) =>
                setAnexos((anteriores) =>
                  anteriores.filter((_, i) => i !== indice),
                )
              }
            />
          }
          aoAnexarAula={() => setSeletorAberto((aberto) => !aberto)}
          aoAnexarArquivos={anexarArquivos}
          formatosAceitos={FORMATOS_ACEITOS}
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
        <section className="mt-12 w-full">
          <h2 className="text-text-muted mb-2 text-[10.5px] font-bold tracking-[0.1em] uppercase opacity-80">
            Últimas conversas
          </h2>

          <ListaConversas conversas={visiveis} aoApagar={apagar} />

          {escondidas > 0 && (
            <button
              type="button"
              onClick={() => setMostrarTodas((aberto) => !aberto)}
              aria-expanded={mostrarTodas}
              className="border-border-strong text-text-muted hover:bg-surface-2 hover:text-text-body mt-1.5 w-full rounded-xl border border-dashed py-2 text-[11px] font-bold transition-colors"
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
