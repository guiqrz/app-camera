"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import {
  BarraAnexos,
  FORMATOS_ACEITOS,
  validarArquivo,
} from "@/components/ia/barra-anexos";
import { CartoesSugestao } from "@/components/ia/cartoes-sugestao";
import { CompositorPergunta } from "@/components/ia/compositor-pergunta";
import { MascoteCup } from "@/components/ia/mascote-cup";
import {
  AbaHistorico,
  PainelHistorico,
} from "@/components/ia/painel-historico";
import { SeletorAula } from "@/components/ia/seletor-aula";
import { guardarAnexosPendentes } from "@/lib/anexos-pendentes";
import type { Anexo, Conversa } from "@/lib/types";

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
  // O historico nasce ABERTO: e' a coluna que o prototipo mostra na abertura, e
  // esconde-lo por padrao faria a tela parecer a versao antiga.
  const [historicoAberto, setHistoricoAberto] = useState(true);

  // Anexos escolhidos ANTES de a conversa existir. Quem de fato os envia e' a
  // tela da conversa: a aula viaja como `sessao` no endereco, e os arquivos
  // pelo modulo de pendentes — `File` nao cabe numa URL.
  const [anexos, setAnexos] = useState<Anexo[]>([]);
  const [seletorAberto, setSeletorAberto] = useState(false);

  // Os cartoes de sugestao preenchem o campo e param o cursor onde o professor
  // tem que completar a frase (a data da aula), entao precisam alcanca-lo.
  const campoPergunta = useRef<HTMLTextAreaElement>(null);
  // Ref, e nao state: guardar isto em state renderizaria de novo so' pra mover
  // um cursor, e zera-lo dentro do efeito seria `setState` em efeito (cascata
  // de renders que o lint do projeto proibe, com razao).
  const cursorPendente = useRef<number | null>(null);

  // Posiciona o cursor DEPOIS de o React ter pintado o texto do cartao. Feito
  // em efeito, e nao no clique: enquanto o valor novo nao esta no DOM, qualquer
  // `setSelectionRange` e' descartado pelo redesenho seguinte e o cursor cai no
  // fim do texto — que e' justamente onde ele nao serve, porque o que falta
  // digitar (a data da aula) fica no MEIO da frase.
  useEffect(() => {
    const cursor = cursorPendente.current;
    if (cursor === null) return;
    cursorPendente.current = null;
    const campo = campoPergunta.current;
    if (!campo) return;
    campo.focus();
    campo.setSelectionRange(cursor, cursor);
  }, [pergunta]);

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
      // `router.push` navega no cliente, sem recarregar a pagina. Vao
      // carimbados com o id da conversa — se esta navegacao nao terminar, a
      // pendencia nao pode acabar numa conversa antiga qualquer.
      const arquivos = anexos.filter((anexo) => anexo.tipo === "arquivo");
      if (arquivos.length > 0) guardarAnexosPendentes(conversa.id, arquivos);

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

  const miolo = (
    <div className="mx-auto flex h-full w-full max-w-2xl flex-col">
      {/* O bloco de boas-vindas ocupa o espaco livre e se centraliza DENTRO
          dele; o compositor fica ancorado embaixo. E' o que da' a distancia
          grande entre os cartoes e o campo, sem que ela vire um numero fixo
          que quebraria em tela baixa: o vao e' o que sobrar.

          `flex-shrink-0` e' o que impede o bloco de encolher ABAIXO do proprio
          conteudo quando a tela e' baixa: com `min-h-0` ele comprimia e o
          compositor subia POR CIMA dos cartoes (medido: vao de -140px em
          1000x700). Sem encolher, quem cede e' a rolagem da coluna. */}
      <div className="flex flex-1 flex-shrink-0 flex-col items-center justify-center">
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

      {/* `.cup-abertura` corta o vao vazio do viewBox com margens negativas (o
          desenho ocupa so' a faixa central da caixa) e ancora o halo que
          respira atras do mascote. As margens sao proporcionais ao tamanho da
          caixa — a regra em globals.css tem um caso proprio pra 185px. */}
      <span className="cup-abertura">
        <MascoteCup size={185} animado titulo="Cup, o assistente" />
      </span>

      <h1
        className="text-text mt-1 text-center text-[27px] leading-tight font-semibold tracking-tight sm:text-[33px]"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {saudacao}, professor.
        <br />
        {/* O gradiente da marca vive so' aqui: e' o maior texto da tela e o
            unico lugar onde a cor carrega identidade em vez de hierarquia.

            A luz que atravessa: o gradiente e' desenhado em 300% da largura e
            dividido em tres tercos — os das pontas sao a marca pura e
            IDENTICOS entre si, e o do meio carrega a faixa clara. Animar
            `background-position` desliza a faixa pelo texto, e como as duas
            pontas pintam igual, o salto de 100% pra 0% no fim do ciclo e'
            invisivel. O clip continua sendo o TEXTO, entao a luz so' existe
            dentro das letras.
            A luz usa o roxo e o azul LAVADOS, e nao branco puro — branco
            quebraria a identidade da marca. */}
        <span
          className="bg-clip-text text-transparent"
          style={{
            backgroundImage:
              "linear-gradient(100deg, #7b2cbf 0%, #4a9fd8 33.33%, #7b2cbf 40%, #c9a6f0 48%, #a9d4f5 50%, #4a9fd8 58%, #7b2cbf 66.66%, #4a9fd8 100%)",
            backgroundSize: "300% 100%",
            /* 0% = so' a faixa da marca visivel. E' o estado de REPOUSO. */
            backgroundPosition: "0% 0",
            animation: "luz-passando 7s ease-in-out infinite",
          }}
        >
          O que vamos ver hoje?
        </span>
      </h1>

      {/* Curto de proposito: o texto anterior listava "anexe uma prova, peca um
          resumo", que e' exatamente o que os tres cartoes abaixo ja' dizem —
          repetir empurrava a leitura pra baixo sem informar. */}
      <p className="text-text-muted mt-2 text-center text-sm">
        Seu assistente para as aulas da semana.
      </p>

      <CartoesSugestao
        aoEscolher={(texto, cursor) => {
          // O cursor e' aplicado no efeito la' em cima, e nao aqui: num
          // `<textarea>` controlado, mexer na selecao antes de o React pintar o
          // valor novo e' desfeito pelo proprio redesenho — o cursor acabava no
          // fim do texto (medido no navegador, com clique de verdade).
          cursorPendente.current = cursor;
          setPergunta(texto);
        }}
      />
      </div>

      {seletorAberto && (
        <div className="mt-5 w-full flex-none">
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

      {/* Ancorado no rodape: o vao ate' os cartoes vem do `flex-1` do bloco de
          boas-vindas acima, e nao de uma margem fixa. `mt-4` e' so' o respiro
          minimo pra quando a tela for baixa e o vao livre virar zero. */}
      <div className="mt-4 w-full flex-none">
        <CompositorPergunta
          valor={pergunta}
          aoMudar={setPergunta}
          aoEnviar={comecar}
          ocupado={criando}
          rotuloOcupado="Começando…"
          aria="Sua primeira pergunta"
          campoRef={campoPergunta}
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
          className="mt-3 w-full flex-none text-xs font-semibold"
          style={{ color: "var(--danger-fg)" }}
          role="alert"
        >
          {erro}
        </p>
      )}
    </div>
  );

  // Duas colunas: o miolo e o historico. A classe carrega o grid e o `gap` de
  // 20px do prototipo; `data-historico` derruba a coluna quando ele fecha.
  return (
    <div className="conteudo-ia" data-historico={historicoAberto ? "sim" : "nao"}>
      {/* Sem `justify-center` aqui: quem centraliza e' o bloco de boas-vindas
          DENTRO do miolo, pra que o compositor possa ficar ancorado no rodape.
          `overflow-y: auto` porque o grid tem altura fixa — em tela baixa o
          miolo passa da altura e sem rolagem propria seria CORTADO pelo
          `overflow: hidden` do pai. */}
      <div className="flex min-w-0 flex-col overflow-y-auto">{miolo}</div>

      {historicoAberto ? (
        <PainelHistorico
          conversas={conversas}
          aoApagar={apagar}
          aoNova={() => {
            // "Nova conversa" na abertura e' onde ele ja' esta: o util e'
            // limpar o que estava escrito e devolver o foco ao campo.
            setPergunta("");
            setAnexos([]);
            setErro(null);
            campoPergunta.current?.focus();
          }}
          aoFechar={() => setHistoricoAberto(false)}
        />
      ) : (
        <AbaHistorico aoAbrir={() => setHistoricoAberto(true)} />
      )}
    </div>
  );
}
