"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  BarraAnexos,
  FORMATOS_ACEITOS,
  validarArquivo,
} from "@/components/ia/barra-anexos";
import { BolhaMensagem } from "@/components/ia/bolha-mensagem";
import { SeletorAula } from "@/components/ia/seletor-aula";
import { IconCalendario, IconFoto } from "@/components/ui/icons";
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
  const [anexos, setAnexos] = useState<Anexo[]>(
    anexoInicial ? [anexoInicial] : [],
  );
  const [seletorAberto, setSeletorAberto] = useState(false);

  const fimDaLista = useRef<HTMLDivElement>(null);
  const campoDeArquivo = useRef<HTMLInputElement>(null);

  // Rola pro fim a cada mensagem nova. `behavior: "smooth"` porque o salto seco
  // faz perder de vista de onde a conversa estava.
  useEffect(() => {
    fimDaLista.current?.scrollIntoView({ behavior: "smooth", block: "end" });
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
    setAnexos([]);
    void enviarTexto(texto, anexoInicial ? [anexoInicial] : []);
    // `mensagens` e `anexos` de proposito fora das dependencias: mudam a cada
    // resposta, e reexecutar o efeito por isso e' o que a guarda evita.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perguntaPendente, anexoInicial, enviarTexto]);

  const enviar = (evento: React.FormEvent) => {
    evento.preventDefault();

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

    // Limpa o input pra reanexar o MESMO arquivo depois de remove-lo funcionar:
    // sem isso o `change` nao dispara na segunda escolha do mesmo caminho.
    if (campoDeArquivo.current) campoDeArquivo.current.value = "";
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pr-1">
        {mensagens.length === 0 && !pensando && (
          <p className="text-text-muted py-6 text-sm leading-relaxed">
            Faça a primeira pergunta sobre suas aulas.
          </p>
        )}

        {mensagens.map((mensagem) => (
          <BolhaMensagem key={mensagem.id} mensagem={mensagem} />
        ))}

        {pensando && (
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
              Cup AI está pensando…
            </span>
          </div>
        )}

        <div ref={fimDaLista} />
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

      <form onSubmit={enviar} className="flex flex-col gap-2">
        <BarraAnexos
          anexos={anexos}
          aoRemover={(indice) =>
            setAnexos((anteriores) => anteriores.filter((_, i) => i !== indice))
          }
        />

        {/* Enter envia, Shift+Enter quebra linha: o professor escreve perguntas
            de varias linhas, e um <textarea> que so' envia por clique obriga a
            tirar a mao do teclado a cada pergunta. */}
        <textarea
          value={pergunta}
          onChange={(evento) => setPergunta(evento.target.value)}
          onKeyDown={(evento) => {
            if (evento.key === "Enter" && !evento.shiftKey) {
              evento.preventDefault();
              enviar(evento);
            }
          }}
          rows={3}
          placeholder="Pergunte sobre suas aulas…"
          aria-label="Sua pergunta"
          disabled={pensando}
          className="border-border-default bg-surface text-text-body focus:border-primary w-full resize-y rounded-xl border px-4 py-3 text-sm leading-relaxed outline-none disabled:cursor-not-allowed disabled:opacity-60"
        />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setSeletorAberto((aberto) => !aberto)}
              disabled={pensando}
              aria-expanded={seletorAberto}
              className="border-border-default text-text hover:bg-surface-2 flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-extrabold transition-colors disabled:cursor-not-allowed disabled:opacity-60"
            >
              <IconCalendario size={14} />
              Anexar aula
            </button>

            <button
              type="button"
              onClick={() => campoDeArquivo.current?.click()}
              disabled={pensando}
              className="border-border-default text-text hover:bg-surface-2 flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-extrabold transition-colors disabled:cursor-not-allowed disabled:opacity-60"
            >
              <IconFoto size={14} />
              Anexar arquivo
            </button>

            {/* O input nativo fica escondido porque o visual dele nao combina
                com o resto da tela e nao aceita estilo. O botao acima o aciona. */}
            <input
              ref={campoDeArquivo}
              type="file"
              multiple
              accept={FORMATOS_ACEITOS.join(",")}
              onChange={(evento) => anexarArquivos(evento.target.files)}
              className="hidden"
              tabIndex={-1}
            />
          </div>

          <div className="flex items-center gap-3">
            <span className="text-text-muted hidden text-xs sm:inline">
              Enter envia · Shift+Enter quebra linha
            </span>
            <button
              type="submit"
              disabled={pensando || !pergunta.trim()}
              className="text-text-on-brand rounded-xl px-5 py-2.5 text-sm font-extrabold transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
              style={{ background: "var(--primary)" }}
            >
              {pensando ? "Enviando…" : "Perguntar"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
