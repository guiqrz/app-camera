"use client";

import { useCallback, useEffect, useState } from "react";

import { DicaAjuda } from "@/components/ui/dica-ajuda";
import { IconLousa, IconRecomecar } from "@/components/ui/icons";
import { horaDoTimestamp } from "@/lib/format";
import type { Lousa } from "@/lib/types";

type PainelLousaProps = {
  /**
   * Sessao da aula em curso, ou null quando a camera subiu sem turma agendada.
   * Sem sessao nao ha aula onde guardar o quadro — a captura fica indisponivel
   * em vez de gravar solto.
   */
  sessaoId: number | null;
  /** Desliga o botao (camera fora do ar, ou troca de modo em curso). */
  desabilitado?: boolean;
};

/** Ritmo do polling. A camera le o pedido uma vez por ciclo (~1s) e o Gemini
 *  responde em segundos, entao 2s acompanha as duas coisas sem martelar a API.
 *
 *  E' polling e nao uma espera fixa de proposito: a versao anterior dava um
 *  `await` de 1,6s e buscava UMA vez. No uso real isso quebrou de duas formas —
 *  se a foto demorasse mais que isso, ela nunca aparecia; e o `await` da busca
 *  (que na epoca esperava o Gemini) prendia o botao em "Capturando…" por
 *  dezenas de segundos. */
const INTERVALO_MS = 2000;

/** Teto do polling depois de uma captura, em ciclos. Protege contra ficar
 *  batendo na API pra sempre se a camera morrer bem na hora da captura. */
const MAXIMO_CICLOS_ESPERANDO_FOTO = 15;

/**
 * Captura do quadro e lista dos quadros ja guardados, no modo Lousa.
 *
 * So' aparece quando a camera esta NO modo Lousa: guardar imagem e' excecao
 * autorizada apenas nesse modo (ver CLAUDE.md do backend, secao Privacidade), e
 * um botao visivel fora dele prometeria algo que a API recusa com 409.
 *
 * A leitura pelo Gemini acontece dentro do GET das lousas, no backend — por
 * isso a busca pode demorar alguns segundos na primeira vez depois de uma
 * captura. O estado de cada lousa ('lendo'/'pronta'/'falhou') e' o que a tela
 * usa pra dizer em que pe esta, em vez de mostrar um texto vazio que nao
 * distingue "processando" de "quadro em branco".
 */
export function PainelLousa({ sessaoId, desabilitado = false }: PainelLousaProps) {
  const [lousas, setLousas] = useState<Lousa[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  /**
   * Quantas fotos esperamos ter depois do ultimo clique em Capturar.
   *
   * E' o que segura o rotulo em "Capturando…" ate' a foto REALMENTE chegar,
   * sem depender de um `await` de duracao fixa: o botao volta ao normal quando
   * `lousas.length` alcanca este numero. null = nao ha captura em curso.
   */
  const [esperandoAte, setEsperandoAte] = useState<number | null>(null);
  const [ciclosEsperando, setCiclosEsperando] = useState(0);

  const buscar = useCallback(async () => {
    if (sessaoId === null) return;
    try {
      const resposta = await fetch(`/api/lousas/${sessaoId}`, { cache: "no-store" });
      if (!resposta.ok) throw new Error("falha ao listar");
      const dados = (await resposta.json()) as { lousas: Lousa[] };
      setLousas(dados.lousas);
      setErro(null);
    } catch {
      setErro("Não foi possível carregar os quadros desta aula.");
    } finally {
      setCarregando(false);
    }
  }, [sessaoId]);

  // Busca ao entrar no modo: a aula pode ja' ter quadros guardados de antes (o
  // professor entrou na Lousa, saiu e voltou).
  useEffect(() => {
    void buscar();
  }, [buscar]);

  const capturaPendente = esperandoAte !== null && lousas.length < esperandoAte;
  const lendoAlgum = lousas.some((lousa) => lousa.estado === "lendo");

  // Polling enquanto ha foto pra chegar OU texto pra ficar pronto. Sem isso a
  // tela ficava parada: a captura acontece no processo da camera e a leitura no
  // backend, e nenhum dos dois tem como avisar o navegador.
  useEffect(() => {
    if (!capturaPendente && !lendoAlgum) return;

    const timer = setInterval(() => {
      void buscar();
      // So' conta ciclo enquanto espera a FOTO: a leitura do texto pode
      // demorar mais e nao deve estourar o teto.
      if (capturaPendente) setCiclosEsperando((atual) => atual + 1);
    }, INTERVALO_MS);
    return () => clearInterval(timer);
  }, [capturaPendente, lendoAlgum, buscar]);

  // Desiste de esperar a foto depois do teto. A captura pode ter falhado no
  // processo da camera (disco cheio, camera desligada no meio), e ali o
  // backend registra no log mas nao tem como avisar a tela.
  useEffect(() => {
    if (ciclosEsperando < MAXIMO_CICLOS_ESPERANDO_FOTO) return;
    setEsperandoAte(null);
    setCiclosEsperando(0);
    setErro(
      "A câmera não confirmou a captura. Verifique se ela continua ligada no modo Lousa.",
    );
  }, [ciclosEsperando]);

  // Chegou a foto que esperavamos: para de esperar.
  useEffect(() => {
    if (esperandoAte !== null && lousas.length >= esperandoAte) {
      setEsperandoAte(null);
      setCiclosEsperando(0);
    }
  }, [lousas.length, esperandoAte]);

  async function capturar() {
    setErro(null);
    try {
      const resposta = await fetch("/api/camera/lousa/capturar", { method: "POST" });
      if (!resposta.ok) {
        const corpo = (await resposta.json().catch(() => null)) as
          | { erro?: string }
          | null;
        setErro(corpo?.erro ?? "Não foi possível capturar o quadro.");
        return;
      }
      // A foto ainda nao existe: a camera le o pedido no proximo ciclo. Quem
      // detecta a chegada e' o polling, comparando com este alvo — em vez de
      // um `await` fixo, que perdia a foto quando ela demorava mais.
      setEsperandoAte(lousas.length + 1);
      setCiclosEsperando(0);
    } catch {
      setErro("Não foi possível falar com a câmera.");
    }
  }

  const jaCapturou = lousas.length > 0;
  const capturando = capturaPendente;

  return (
    <div className="border-border-default bg-surface shadow-card bloco-cam rounded-[12px] border">
      <div className="bloco-cam-topo">
        <span className="bloco-cam-rotulo">Quadro da aula</span>
        <span className="bloco-cam-ajuda">
        <DicaAjuda
          texto={
            "Guarda uma foto do que você escreveu no quadro e lê o texto dela. " +
            "A foto fica junto desta aula e é apagada depois de 60 dias. " +
            "O engajamento já registrado da aula não é afetado."
          }
          rotulo="O que a captura do quadro faz"
          lado="esquerda"
        />
        </span>
      </div>

      {sessaoId === null ? (
        <p className="lousa-vazia">
          A câmera está sem turma nesta sessão, então não há aula onde guardar o
          quadro. Inicie a câmera com uma turma para usar a captura.
        </p>
      ) : (
        <>
          <button
            type="button"
            onClick={capturar}
            disabled={desabilitado || capturando}
            className="btn-acao forte"
          >
            <span aria-hidden>
              {jaCapturou ? <IconRecomecar size={14} /> : <IconLousa size={14} />}
            </span>
            {capturando
              ? "Capturando…"
              : jaCapturou
                ? "Capturar de novo"
                : "Capturar quadro"}
          </button>

          {erro && (
            <p
              role="alert"
              className="rounded-xl px-3 py-2 text-xs leading-relaxed font-semibold"
              style={{ background: "var(--danger-bg)", color: "var(--danger-fg)" }}
            >
              {erro}
            </p>
          )}

          {!jaCapturou && !carregando && !erro && (
            <p className="lousa-vazia">
              Nenhum quadro guardado nesta aula ainda. Use o botão acima quando
              escrever algo no quadro que valha guardar.
            </p>
          )}

          {lousas.length > 0 && (
            <ul className="lousa-lista">
              {lousas.map((lousa, indice) => (
                <li key={lousa.id} className="lousa-item">
                  {/* Foto AO LADO do texto (grade 84px 1fr), e nao empilhada:
                      a lista fica varrivel de relance, que e' como o professor
                      procura "aquela captura da equacao". */}
                  <span className="lousa-foto">
                    {/* eslint-disable-next-line @next/next/no-img-element --
                        next/image exigiria configurar o host e otimiza no
                        servidor; aqui a imagem vem da nossa propria ponte, ja'
                        pequena, e uma so' por captura. */}
                    <img
                      src={`/api/lousas/${lousa.sessao_id}/${lousa.id}/imagem`}
                      alt={`Foto do quadro, captura ${indice + 1}`}
                    />
                  </span>

                  <div className="min-w-0">
                    <div className="lousa-cabecalho">
                      <span className="num">Captura {indice + 1}</span>
                      <span className="hora">
                        {horaDoTimestamp(lousa.capturada_em)}
                      </span>
                    </div>
                    <TextoDaLousa lousa={lousa} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

/**
 * O texto lido, ou o estado quando ele ainda nao existe.
 *
 * Separado porque sao tres casos com tratamento diferente, e um `? :`
 * encadeado no meio do JSX esconderia justamente a distincao que importa.
 */
function TextoDaLousa({ lousa }: { lousa: Lousa }) {
  if (lousa.estado === "lendo") {
    return (
      <p className="text-text-muted text-xs" role="status">
        Lendo o quadro… O texto aparece aqui sozinho.
      </p>
    );
  }

  if (lousa.estado === "falhou") {
    return (
      <p
        className="lousa-texto-item font-semibold"
        style={{ color: "var(--danger-fg)" }}
      >
        Não foi possível ler este quadro
        {lousa.erro ? `: ${lousa.erro}` : "."}
      </p>
    );
  }

  return <p className="lousa-texto-item whitespace-pre-wrap">{lousa.texto}</p>;
}
