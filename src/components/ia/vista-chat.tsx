"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  BarraAnexos,
  FORMATOS_ACEITOS,
  validarArquivo,
} from "@/components/ia/barra-anexos";
import { BolhaMensagem } from "@/components/ia/bolha-mensagem";
import { CompositorPergunta } from "@/components/ia/compositor-pergunta";
import { MascoteCup } from "@/components/ia/mascote-cup";
import { SeletorAula } from "@/components/ia/seletor-aula";
import { retirarAnexosPendentes } from "@/lib/anexos-pendentes";
import type { Anexo, Conversa, MensagemConversa } from "@/lib/types";

type VistaChatProps = {
  conversa: Conversa;
  /**
   * Pergunta que criou a conversa e ainda nao foi enviada.
   *
   * Vem de /ia, onde `POST /ia/conversas` so' cria a conversa e usa o texto
   * como titulo. Enviar aqui, sozinho, evita o professor digitar duas vezes.
   */
  perguntaPendente?: string;
  /** Aula ja' anexada na abertura — entrada pelo relatorio (`/ia?sessao=`). */
  anexoInicial?: Anexo;
};

/** Id negativo pras mensagens que ainda nao existem no banco — ver `enviar`. */
let proximoIdLocal = -1;

/**
 * Conversa aberta: historico, campo de pergunta e o estado "pensando…".
 *
 * A pergunta aparece na hora, com id local negativo, antes de a API responder.
 * Sem isso a tela ficava parada por vinte segundos depois do envio e o
 * professor nao tinha sinal nenhum de que o clique funcionou. Os ids negativos
 * nunca colidem com os do banco (que sao positivos e crescentes), entao a
 * recarga seguinte simplesmente substitui a lista inteira.
 *
 * Terminado o envio, `recarregarMensagens` troca as bolhas locais pelo que o
 * banco de fato gravou — e' o banco, nao esta tela, quem tem a verdade sobre a
 * conversa.
 *
 * O texto digitado volta pro campo quando a pergunta NAO foi gravada: perder um
 * paragrafo escrito a mao por uma falha de rede e' o pior desfecho possivel. A
 * excecao e' o 502, em que a API gravou a pergunta antes de falhar — ali
 * devolver o texto convidaria o professor a grava-la de novo, duplicada.
 */
export function VistaChat({
  conversa,
  perguntaPendente,
  anexoInicial,
}: VistaChatProps) {
  const [mensagens, setMensagens] = useState<MensagemConversa[]>(
    conversa.mensagens ?? [],
  );
  const [pergunta, setPergunta] = useState("");
  const [pensando, setPensando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  // A aula chega pelo endereco (`?sessao=`) e os arquivos pelo modulo de
  // pendentes, que a abertura preencheu antes de navegar. `useState` com
  // funcao pra retirada acontecer UMA vez, na montagem: fora dela, cada
  // desenho novo esvaziaria a caixa e os arquivos sumiriam.
  const [anexos, setAnexos] = useState<Anexo[]>(() => [
    ...(anexoInicial ? [anexoInicial] : []),
    ...retirarAnexosPendentes(),
  ]);
  const [seletorAberto, setSeletorAberto] = useState(false);

  const listaDeMensagens = useRef<HTMLDivElement>(null);

  /**
   * Rola pro fim a cada mensagem nova.
   *
   * Rola o PROPRIO container (scrollTop), e nao um `scrollIntoView` numa ancora
   * no fim da lista: o scrollIntoView procura o ancestral rolavel mais proximo
   * e, numa pagina com varios niveis de overflow, acertava o errado — a
   * resposta longa chegava e a tela ficava parada na mensagem anterior, com o
   * professor tendo que rolar na mao justamente quando havia mais o que ler.
   *
   * O rAF duplo espera o navegador PINTAR a mensagem nova antes de medir
   * scrollHeight. Sem ele, a conta usava a altura de antes da resposta entrar,
   * e a rolagem parava no meio dela.
   */
  useEffect(() => {
    const container = listaDeMensagens.current;
    if (!container) return;

    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
      });
    });
    return () => cancelAnimationFrame(id);
  }, [mensagens, pensando]);

  /**
   * Recarrega as mensagens do banco, substituindo as bolhas locais.
   *
   * Chamado depois de TODO envio que chegou ao servidor — inclusive na falha.
   * Sem isto, as bolhas de id negativo ficavam na tela pra sempre e a lista
   * divergia do que estava gravado: no 502 a API grava a pergunta antes de
   * chamar o modelo, entao a tela mostraria uma pergunta a menos do que o banco
   * tem, e perguntar de novo gravaria a mesma coisa duas vezes sem o professor
   * ver.
   *
   * Falha silenciosa de proposito: quem chama ja' mostrou o resultado do envio,
   * e um segundo aviso sobre "nao consegui reler" so' confundiria. As bolhas
   * locais continuam la' ate' a proxima recarga.
   */
  const recarregarMensagens = useCallback(async () => {
    try {
      const r = await fetch(`/api/ia/conversas/${conversa.id}`, {
        cache: "no-store",
      });
      if (!r.ok) return;
      const atual = (await r.json()) as Conversa;
      if (atual.mensagens) setMensagens(atual.mensagens);
    } catch {
      // Ver JSDoc: a tela continua utilizavel com as bolhas locais.
    }
  }, [conversa.id]);

  const enviarTexto = useCallback(async (texto: string, anexados: Anexo[]) => {
    setErro(null);
    setPensando(true);

    // Timestamp local so' pro rotulo de hora da bolha otimista, que vive ate' o
    // envio terminar. `recarregarMensagens` troca isto pelo horario do banco.
    const agora = new Date();
    const carimbo = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, "0")}-${String(agora.getDate()).padStart(2, "0")} ${String(agora.getHours()).padStart(2, "0")}:${String(agora.getMinutes()).padStart(2, "0")}:00`;

    const otimista: MensagemConversa = {
      id: proximoIdLocal--,
      papel: "professor",
      texto,
      criada_em: carimbo,
      // Mesmos rotulos que o backend vai gravar: sem isto o chip sumia no
      // instante do envio e so' voltava na recarga, como se o anexo tivesse
      // sido perdido.
      anexos: anexados.map((anexo) =>
        anexo.tipo === "aula" ? anexo.rotulo : anexo.arquivo.name,
      ),
    };
    setMensagens((anteriores) => [...anteriores, otimista]);

    try {
      // FormData e nao JSON porque a pergunta carrega arquivos. As aulas vao
      // como ID em `sessao_ids`: o TEXTO da transcricao e' lido no servidor do
      // CUPCAM e nunca trafega pelo navegador (regra de privacidade).
      const corpo = new FormData();
      corpo.append("pergunta", texto);

      const sessaoIds = anexados
        .filter((anexo) => anexo.tipo === "aula")
        .map((anexo) => anexo.sessaoId);
      if (sessaoIds.length > 0) corpo.append("sessao_ids", sessaoIds.join(","));

      for (const anexo of anexados) {
        if (anexo.tipo === "arquivo") corpo.append("anexos", anexo.arquivo);
      }

      const r = await fetch(`/api/ia/conversas/${conversa.id}/perguntar`, {
        method: "POST",
        body: corpo,
      });

      if (!r.ok) {
        const dados = (await r.json().catch(() => null)) as { erro?: string } | null;
        setMensagens((anteriores) => anteriores.filter((m) => m.id !== otimista.id));
        setErro(dados?.erro ?? "Não foi possível enviar a pergunta.");

        // 502 e' o UNICO caso em que a API ja' gravou a pergunta: ela recebeu,
        // gravou e so' entao o modelo falhou. Recarregar mostra a pergunta como
        // de fato ficou, e o texto NAO volta pro campo — reenviar dali gravaria
        // a mesma pergunta duas vezes.
        //
        // Todo o resto (inclusive o 504 de "nao alcancei a API": notebook
        // desligado, tunel caido) nao gravou nada, entao o texto e os anexos
        // voltam pro professor tentar de novo sem redigitar.
        if (r.status === 502) {
          await recarregarMensagens();
        } else {
          setPergunta(texto);
          setAnexos(anexados);
        }
        return;
      }

      // Sucesso: a resposta veio, mas quem tem os ids reais das duas mensagens
      // (pergunta e resposta) e' o banco. Recarregar troca as bolhas locais
      // pelas gravadas, com o horario real em vez do carimbo do navegador.
      await recarregarMensagens();
    } catch {
      setMensagens((anteriores) => anteriores.filter((m) => m.id !== otimista.id));
      setPergunta(texto);
      setAnexos(anexados);
      setErro("Não foi possível enviar a pergunta. Verifique a conexão.");
    } finally {
      setPensando(false);
    }
  }, [conversa.id, recarregarMensagens]);

  // A pergunta que criou a conversa, enviada uma unica vez ao abrir a tela.
  // O `useRef` guarda o envio ja' feito: sem ele, um novo desenho do componente
  // (ou o Strict Mode em desenvolvimento) reenviaria a mesma pergunta e o
  // professor pagaria duas chamadas ao modelo pelo texto que escreveu uma vez.
  const pendenteEnviada = useRef(false);
  useEffect(() => {
    const texto = perguntaPendente?.trim();
    // So' na conversa recem-criada: com mensagem gravada, a pergunta ja' foi.
    if (!texto || pendenteEnviada.current || mensagens.length > 0) return;
    pendenteEnviada.current = true;

    // Leva TUDO que estava anexado na abertura — a aula e os arquivos que
    // vieram pelo modulo de pendentes. Mandar so' a aula (como era antes)
    // faria o professor ver o PDF escolhido sumir sem aviso.
    //
    // `anexos` aqui e' seguramente o valor da montagem: a guarda acima so'
    // deixa passar quando a conversa ainda nao tem mensagem, e nesse ponto
    // ninguem mexeu na lista.
    const escolhidos = anexos;
    setAnexos([]);
    void enviarTexto(texto, escolhidos);
    // `mensagens` e `anexos` de proposito fora das dependencias: mudam a cada
    // resposta, e reexecutar o efeito por isso e' o que a guarda evita.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perguntaPendente, enviarTexto]);

  const enviar = () => {
    const texto = pergunta.trim();
    if (!texto || pensando) return;

    const anexados = anexos;
    setPergunta("");
    setAnexos([]);
    void enviarTexto(texto, anexados);
  };

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
    // Recusa parcial e' comum (o professor seleciona varios de uma vez): anexa
    // o que serve e explica so' o que ficou de fora.
    setErro(recusados.length > 0 ? recusados.join(" ") : null);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      {/* Quem rola e' esta caixa, em largura PLENA: assim a barra de rolagem
          nasce na borda da area de conteudo, e nao no meio da tela. A largura
          de leitura fica no miolo, um nivel abaixo. */}
      <div
        ref={listaDeMensagens}
        className="min-h-0 flex-1 overflow-y-auto"
      >
        {/* O respiro que o <main> perdeu volta AQUI DENTRO: assim o texto nao
            encosta na borda, mas a barra de rolagem continua na ponta. */}
        <div className="mx-auto flex max-w-3xl flex-col gap-4 px-5 pt-1 lg:px-10">
        {mensagens.length === 0 && !pensando && (
          <p className="text-text-muted py-6 text-sm leading-relaxed">
            Faça a primeira pergunta sobre suas aulas.
          </p>
        )}

        {mensagens.map((mensagem) => (
          <BolhaMensagem key={mensagem.id} mensagem={mensagem} />
        ))}

        {/* Mesma estrutura de uma resposta (avatar + nome + texto): a espera
            ocupa o lugar onde a resposta vai nascer, entao a lista nao "pula"
            quando ela chega. */}
        {pensando && (
          <div className="flex items-start gap-3" role="status">
            <span className="-my-2 -mr-1 flex-none">
              <MascoteCup size={38} animado />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-text-muted mb-1.5 text-xs font-extrabold">
                Cup AI
              </p>
              <p className="text-text-muted text-sm">Pensando…</p>
            </div>
          </div>
        )}
        </div>
      </div>

      {/* Mesma largura de leitura da lista acima: o campo tem que ficar
          alinhado com as mensagens, nao com a borda da tela. O padding
          lateral repoe o do <main>, que a pagina anulou; o de baixo e' a
          folga entre o campo e o fim da janela. */}
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-5 pb-4 lg:px-10 lg:pb-6">
      {erro && (
        <p
          className="text-xs font-semibold"
          style={{ color: "var(--danger-fg)" }}
          role="alert"
        >
          {erro}
        </p>
      )}

      {seletorAberto && (
        <SeletorAula
          aoEscolher={(anexo) => {
            // Mesma aula duas vezes mandaria a transcricao repetida pro modelo
            // e dobraria o contexto sem acrescentar nada.
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
      )}

      <CompositorPergunta
        valor={pergunta}
        aoMudar={setPergunta}
        aoEnviar={enviar}
        ocupado={pensando}
        rotuloOcupado="Enviando…"
        anexos={
          <BarraAnexos
            anexos={anexos}
            aoRemover={(indice) =>
              setAnexos((anteriores) => anteriores.filter((_, i) => i !== indice))
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
    </div>
  );
}
