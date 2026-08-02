"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Tipos da Web Speech API.
 *
 * Escritos a mao porque o `lib.dom` do TypeScript ainda nao os traz: a API e'
 * padrao de fato (Chrome, Edge, Safari) mas nunca virou recomendacao do W3C.
 * So' o que esta tela usa.
 */
type ResultadoFala = {
  readonly isFinal: boolean;
  readonly length: number;
  item(indice: number): { transcript: string };
  [indice: number]: { transcript: string };
};

type EventoFala = Event & {
  readonly resultIndex: number;
  readonly results: {
    readonly length: number;
    item(indice: number): ResultadoFala;
    [indice: number]: ResultadoFala;
  };
};

type EventoErroFala = Event & { readonly error: string };

type ReconhecimentoDeFala = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((evento: EventoFala) => void) | null;
  onerror: ((evento: EventoErroFala) => void) | null;
  onend: (() => void) | null;
};

type ConstrutorDeReconhecimento = new () => ReconhecimentoDeFala;

/** O construtor, com o prefixo que o Chrome ainda exige. */
function acharConstrutor(): ConstrutorDeReconhecimento | null {
  if (typeof window === "undefined") return null;

  const janela = window as unknown as {
    SpeechRecognition?: ConstrutorDeReconhecimento;
    webkitSpeechRecognition?: ConstrutorDeReconhecimento;
  };
  return janela.SpeechRecognition ?? janela.webkitSpeechRecognition ?? null;
}

type BotaoMicrofoneProps = {
  /** Recebe o texto reconhecido para quem chama juntar ao que ja' existe. */
  aoTranscrever: (texto: string) => void;
  desabilitado?: boolean;
};

/**
 * Ditado por voz: o professor fala e o texto entra no campo.
 *
 * Usa a Web Speech API do proprio navegador — nada de backend. O ditado e'
 * CONTINUO (`continuous`), entao uma pausa pra pensar no meio da frase nao
 * encerra a gravacao; quem encerra e' o professor, clicando de novo.
 *
 * `interimResults` liga o texto parcial: a frase aparece enquanto e' falada,
 * em vez de surgir inteira no fim. Sem isso o professor fica olhando pra um
 * campo parado sem saber se o microfone pegou.
 *
 * O botao SOME em navegador sem suporte (Firefox, por ora), em vez de aparecer
 * quebrado: um microfone que nao faz nada ao ser clicado e' pior do que a
 * ausencia dele — o professor tentaria de novo achando que errou o clique.
 */
export function BotaoMicrofone({
  aoTranscrever,
  desabilitado = false,
}: BotaoMicrofoneProps) {
  const [suportado, setSuportado] = useState(false);
  const [ouvindo, setOuvindo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const reconhecimento = useRef<ReconhecimentoDeFala | null>(null);

  // Separa "o professor mandou parar" de "o navegador desistiu sozinho": o
  // Chrome encerra o motor apos alguns segundos de silencio, e so' no primeiro
  // caso o ditado deve mesmo acabar. Ver `onend`.
  const queroParar = useRef(false);

  // Espelho do callback: o `onresult` e' registrado uma vez, e sem isto ele
  // ficaria preso na primeira versao da funcao.
  const aoTranscreverAgora = useRef(aoTranscrever);
  useEffect(() => {
    aoTranscreverAgora.current = aoTranscrever;
  }, [aoTranscrever]);

  // A deteccao roda no navegador, depois da montagem: no servidor `window`
  // nao existe, e decidir no render daria hidratacao divergente.
  useEffect(() => {
    const id = setTimeout(() => setSuportado(acharConstrutor() !== null), 0);
    return () => clearTimeout(id);
  }, []);

  // Encerra o reconhecimento se a tela sair no meio de uma fala: sem isto o
  // microfone continuaria aberto depois de sair da conversa. A marca impede
  // que o `onend` religue o motor de uma tela que ja' nao existe.
  useEffect(() => {
    return () => {
      queroParar.current = true;
      reconhecimento.current?.abort();
    };
  }, []);

  const alternar = () => {
    setErro(null);

    if (ouvindo) {
      queroParar.current = true;
      reconhecimento.current?.stop();
      return;
    }

    const Construtor = acharConstrutor();
    if (!Construtor) return;

    const motor = new Construtor();
    motor.lang = "pt-BR";
    motor.continuous = true;
    motor.interimResults = true;

    // So' os trechos FINAIS entram no campo: os parciais mudam a cada palavra
    // e, se entrassem, o texto se reescreveria sozinho na tela.
    //
    // `entregues` guarda quantos resultados ja' foram para o campo. Sem esse
    // controle, o Chrome — que reenvia o mesmo resultado quando ele passa de
    // parcial para final — duplicava a frase inteira.
    let entregues = 0;

    motor.onresult = (evento) => {
      let novo = "";
      for (let i = entregues; i < evento.results.length; i++) {
        const resultado = evento.results[i];
        if (resultado.isFinal) {
          novo += resultado[0].transcript;
          entregues = i + 1;
        }
      }
      if (novo.trim()) aoTranscreverAgora.current(novo.trim());
    };

    motor.onerror = (evento) => {
      // "no-speech" e' rotina: o professor ficou em silencio e o Chrome
      // desistiu. O `onend` religa em seguida, entao NAO desliga o estado nem
      // avisa nada — para ele, o microfone continua aberto.
      if (evento.error === "no-speech") return;

      queroParar.current = true;
      setOuvindo(false);
      // "aborted" e' o proprio encerramento pedido pelo professor.
      if (evento.error === "aborted") return;

      setErro(
        evento.error === "not-allowed"
          ? "Permita o microfone no navegador para ditar."
          : "Não consegui ouvir. Tente de novo.",
      );
    };

    // O Chrome encerra o motor sozinho depois de alguns segundos de silencio,
    // mesmo com `continuous`. Religar enquanto o professor nao clicou em parar
    // e' o que faz o ditado durar o quanto ele quiser — sem isso o microfone
    // "morria" no meio da frase e so' o comeco entrava no campo.
    motor.onend = () => {
      if (!queroParar.current) {
        try {
          motor.start();
          return;
        } catch {
          // Se o navegador recusar o religamento, cai no encerramento normal.
        }
      }
      setOuvindo(false);
    };

    reconhecimento.current = motor;
    queroParar.current = false;
    try {
      motor.start();
      setOuvindo(true);
    } catch {
      // `start()` lanca se ja' houver um reconhecimento em curso — nesse caso
      // nao ha nada a corrigir, so' nao entrar no estado "ouvindo".
      setOuvindo(false);
    }
  };

  if (!suportado) return null;

  return (
    <span className="relative flex items-center">
      <button
        type="button"
        onClick={alternar}
        disabled={desabilitado}
        aria-label={ouvindo ? "Parar de ditar" : "Ditar a pergunta por voz"}
        aria-pressed={ouvindo}
        title={erro ?? (ouvindo ? "Parar de ditar" : "Ditar por voz")}
        className={`grid h-9 w-9 flex-none place-items-center rounded-xl border transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
          ouvindo
            ? "border-transparent text-white"
            : "border-border-default text-text-body hover:bg-surface-2"
        }`}
        style={ouvindo ? { background: "var(--danger)" } : undefined}
      >
        <svg
          width={16}
          height={16}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden
          focusable={false}
        >
          <rect
            x="9"
            y="2.5"
            width="6"
            height="11"
            rx="3"
            stroke="currentColor"
            strokeWidth="1.9"
          />
          <path
            d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M9 21h6"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
          />
        </svg>
      </button>

      {/* Pulso enquanto ouve: a cor sozinha nao diz que o microfone esta
          ATIVO agora, e o professor precisa saber que a sala esta sendo
          escutada. */}
      {ouvindo && (
        <span
          className="pointer-events-none absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5"
          aria-hidden
        >
          <span
            className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
            style={{ background: "var(--danger)" }}
          />
          <span
            className="relative inline-flex h-2.5 w-2.5 rounded-full"
            style={{ background: "var(--danger)" }}
          />
        </span>
      )}
    </span>
  );
}
