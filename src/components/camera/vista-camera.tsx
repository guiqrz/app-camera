"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { CartaoNumero } from "@/components/aulas/cartao-numero";
import { ControleMicrofone } from "@/components/camera/controle-microfone";
import { PainelLousa } from "@/components/camera/painel-lousa";
import { SeletorModo } from "@/components/camera/seletor-modo";
import { DicaAjuda } from "@/components/ui/dica-ajuda";
import {
  IconCamera,
  IconFechar,
  IconPessoas,
  IconQueda,
  IconRaio,
  IconRelogio,
} from "@/components/ui/icons";
import { duracaoDesde } from "@/lib/format";
import { MODOS_CAMERA_FALLBACK, MODO_PADRAO } from "@/lib/modos-camera";
import { lerSempreGravar } from "@/lib/preferencias-audio";
import type { EstadoCamera, ModoCamera, ModoCameraInfo, Turma } from "@/lib/types";

const INTERVALO_MS = 3000;

/** Limiar do backend para o alerta de dispersao — so' documenta o que ja vem pronto em `alerta_atencao`. */
const LIMIAR_ALERTA_PCT = 20;

/**
 * Rotulo curto de uma turma pro seletor: "3B · sala_32A".
 *
 * Antes mostrava o dia e o horario da turma, mas a agenda saiu de Turma e
 * virou a entidade Aula: hoje uma turma tem varias aulas em dias e horarios
 * diferentes, entao nao existe mais "o horario da turma" pra caber num rotulo
 * de uma linha. A sala e' o que de fato identifica onde a camera esta, e e'
 * ela que desempata turmas de nome parecido nessa lista.
 */
function rotuloDaTurma(turma: Turma): string {
  return `${turma.nome} · ${turma.sala_id}`;
}

/**
 * Tela "Camera": ligar/desligar a captura e acompanhar o estado ao vivo.
 *
 * So' faz polling e mostra numeros ja consolidados pelo backend — a tela
 * nunca pede nem exibe imagem da camera (streaming de video e' proibido
 * pelo escopo do projeto).
 *
 * Estados possiveis (ver EstadoCamera em lib/types.ts):
 * - parada: rodando=false e o professor nao acabou de clicar Ligar;
 * - iniciando: clicou Ligar mas o backend ainda nao confirmou rodando=true
 *   (boot do YOLO + insightface leva alguns segundos) — estado local, o
 *   backend nao distingue isso de "parada" no retorno;
 * - rodando com aula: rodando=true e sessao_id != null;
 * - rodando sem aula: rodando=true e sessao_id == null (fora do horario de
 *   alguma turma cadastrada).
 *
 * O backend nao informa "travou" nem "ja rodava antes de abrir a tela" como
 * estados separados — o polling reconcilia sozinho em qualquer um desses
 * casos, entao nao ha estado extra pra fabricar aqui.
 */
type VistaCameraProps = {
  /** Turmas cadastradas, pro seletor de "qual turma iniciar". Vem do server. */
  turmas: Turma[];
};

export function VistaCamera({ turmas }: VistaCameraProps) {
  const [estado, setEstado] = useState<EstadoCamera | null>(null);
  const [ligando, setLigando] = useState(false);
  const [desligando, setDesligando] = useState(false);
  const [avisoRede, setAvisoRede] = useState<string | null>(null);
  const [avisoAcao, setAvisoAcao] = useState<string | null>(null);
  // "" = automatico por horario; senao, o id (como string) da turma escolhida.
  const [turmaEscolhida, setTurmaEscolhida] = useState<string>("");
  // Rotulos/resumos dos modos. Comeca no fallback local pra tela nunca ficar
  // sem os botoes — a lista real do backend chega logo depois e substitui.
  const [modosDisponiveis, setModosDisponiveis] =
    useState<ModoCameraInfo[]>(MODOS_CAMERA_FALLBACK);
  // Modo escolhido na tela PARADA, aplicado ao ligar.
  const [modoInicial, setModoInicial] = useState<ModoCamera>(MODO_PADRAO);
  // Ultimo modo clicado com a camera rodando. Vira `modoPendente` (derivado)
  // ate' o polling confirmar que a camera realmente trocou.
  const [modoPedido, setModoPedido] = useState<ModoCamera | null>(null);
  // Ultimo estado de microfone pedido, ate' o polling confirmar. Mesma logica
  // do modo: o que a tela mostra como "gravando" vem SEMPRE da captura.
  const [audioPedido, setAudioPedido] = useState<boolean | null>(null);
  // Escolha do microfone na tela PARADA (antes de ligar). Comeca em false e
  // e' substituida pela preferencia "sempre gravar" assim que ela for lida.
  const [audioInicial, setAudioInicial] = useState(false);

  // Evita "piscar" de erro de rede num polling que ainda nao rodou nenhuma vez.
  const primeiraLeituraFeita = useRef(false);

  const buscar = useCallback(async () => {
    try {
      const r = await fetch("/api/camera/estado", { cache: "no-store" });
      if (r.ok) {
        setEstado((await r.json()) as EstadoCamera);
        setAvisoRede(null);
        primeiraLeituraFeita.current = true;
      } else {
        const corpo = (await r.json().catch(() => null)) as { erro?: string } | null;
        // So mostra aviso de rede apos' uma leitura bem-sucedida ja' ter acontecido.
        if (primeiraLeituraFeita.current) {
          setAvisoRede(corpo?.erro ?? "Não foi possível falar com a câmera.");
        }
      }
    } catch {
      // Rede fora, notebook desligado, etc — mensagem estavel, tela nao quebra.
      // So mostra se ja' houve uma leitura bem-sucedida antes.
      if (primeiraLeituraFeita.current) {
        setAvisoRede("Não foi possível falar com a câmera. Verifique se o notebook da sala está ligado.");
      }
    }
  }, []);

  useEffect(() => {
    // setTimeout(0) em vez de chamar buscar() direto no corpo do efeito: o
    // lint (react-hooks/set-state-in-effect) trata o setState sincrono aqui
    // como recalculo derivavel do render, mas polling e' assinatura de um
    // sistema externo (o relogio) — o timeout zero deixa isso explicito sem
    // atrasar a primeira leitura na pratica.
    const primeira = setTimeout(buscar, 0);
    const id = setInterval(buscar, INTERVALO_MS);
    return () => {
      clearTimeout(primeira);
      clearInterval(id);
    };
  }, [buscar]);

  // Lista de modos: uma vez so'. Falhou? Segue com MODOS_CAMERA_FALLBACK —
  // perder a conexao nao pode custar o controle da camera ao professor.
  useEffect(() => {
    let cancelado = false;
    (async () => {
      try {
        const r = await fetch("/api/camera/modos", { cache: "no-store" });
        if (!r.ok) return;
        const dados = (await r.json()) as { modos?: ModoCameraInfo[] };
        if (!cancelado && dados.modos?.length) setModosDisponiveis(dados.modos);
      } catch {
        // Fallback ja esta em uso; nada a fazer.
      }
    })();
    return () => {
      cancelado = true;
    };
  }, []);

  // localStorage e' sistema externo: mesmo setTimeout(0) dos outros efeitos.
  useEffect(() => {
    const id = setTimeout(() => setAudioInicial(lerSempreGravar()), 0);
    return () => clearTimeout(id);
  }, []);

  // Assim que o polling confirma rodando:true, sai do estado "iniciando" e
  // limpa qualquer aviso de acao que tenha piscado durante o boot.
  useEffect(() => {
    if (!estado?.rodando) return;
    const id = setTimeout(() => {
      setLigando(false);
      setAvisoAcao(null);
    }, 0);
    return () => clearTimeout(id);
  }, [estado]);

  // Modo que a camera esta REALMENTE rodando. Um backend anterior a esta
  // versao nao manda o campo — nesse caso assumimos o padrao, que e' como ele
  // se comporta de fato.
  const modoAtivo: ModoCamera =
    estado?.rodando && estado.modo ? estado.modo : MODO_PADRAO;

  // Pendente e' valor DERIVADO, nao estado a sincronizar: o pedido deixa de
  // estar pendente no instante em que o polling mostra a camera naquele modo.
  // Calcular aqui evita um efeito com setState (e o render em cascata que ele
  // causaria); `modoPedido` continua sendo estado porque so' o clique o define.
  const modoPendente = modoPedido !== null && modoPedido !== modoAtivo ? modoPedido : null;

  // Gravando de FATO, segundo a captura — nunca o que foi clicado. Backend
  // anterior a esta versao nao manda o campo, e ausente significa nao gravando:
  // na duvida, a tela nao pode dizer que esta gravando audio de uma sala.
  const audioGravando = (estado?.rodando && estado.audio_ativo) === true;
  const audioPendente =
    audioPedido !== null && audioPedido !== audioGravando ? audioPedido : null;

  const ligar = useCallback(async () => {
    setLigando(true);
    setAvisoAcao(null);
    try {
      // Turma e modo escolhidos a mao vao no corpo. Sem turma e no modo padrao,
      // manda POST sem corpo nenhum: e' o caminho automatico de producao.
      const escolhas: { turma_id?: number; modo?: ModoCamera; audio?: boolean } = {};
      if (turmaEscolhida) escolhas.turma_id = Number(turmaEscolhida);
      if (modoInicial !== MODO_PADRAO) escolhas.modo = modoInicial;
      if (audioInicial) escolhas.audio = true;
      const corpo =
        Object.keys(escolhas).length > 0
          ? {
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(escolhas),
            }
          : {};
      const r = await fetch("/api/camera/ligar", { method: "POST", ...corpo });
      if (r.status === 409) {
        // Ja em execucao — nao e' erro, so' segue o polling normalmente.
        setAvisoAcao("A câmera já está em execução.");
      } else if (!r.ok) {
        const dados = (await r.json().catch(() => null)) as { erro?: string } | null;
        setAvisoAcao(dados?.erro ?? "Não foi possível ligar a câmera.");
        setLigando(false);
        return;
      }
      // Continua "ligando" ate o proximo polling confirmar rodando:true.
      buscar();
    } catch {
      setAvisoAcao("Não foi possível ligar a câmera. Verifique a conexão com o notebook da sala.");
      setLigando(false);
    }
  }, [buscar, turmaEscolhida, modoInicial, audioInicial]);

  const trocarModo = useCallback(
    async (modo: ModoCamera) => {
      if (modo === modoAtivo) return; // ja' esta nele; nao gasta requisicao

      // Otimista so' no rotulo "Aplicando…": o cartao ATIVO continua sendo o
      // que a camera confirmou, porque a troca leva alguns segundos e mentir
      // sobre isso faria o professor achar que o modo ja valia.
      setModoPedido(modo);
      setAvisoAcao(null);
      try {
        const r = await fetch("/api/camera/modo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ modo }),
        });
        if (!r.ok) {
          const dados = (await r.json().catch(() => null)) as { erro?: string } | null;
          setAvisoAcao(dados?.erro ?? "Não foi possível trocar o modo da câmera.");
          setModoPedido(null);
          return;
        }
        buscar();
      } catch {
        setAvisoAcao("Não foi possível trocar o modo. Verifique a conexão com o notebook da sala.");
        setModoPedido(null);
      }
    },
    [buscar, modoAtivo],
  );

  const alternarAudio = useCallback(
    async (ativo: boolean) => {
      // Otimista so' no rotulo "Aplicando…": a faixa "Gravando" continua presa
      // ao que a captura confirmou. Mentir sobre gravacao de audio numa sala com
      // menores seria pior que a espera de alguns segundos.
      setAudioPedido(ativo);
      setAvisoAcao(null);
      try {
        const r = await fetch("/api/camera/audio", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ativo }),
        });
        if (!r.ok) {
          const dados = (await r.json().catch(() => null)) as { erro?: string } | null;
          setAvisoAcao(dados?.erro ?? "Não foi possível mudar o microfone.");
          setAudioPedido(null);
          return;
        }
        buscar();
      } catch {
        setAvisoAcao("Não foi possível mudar o microfone. Verifique a conexão com o notebook da sala.");
        setAudioPedido(null);
      }
    },
    [buscar],
  );

  const desligar = useCallback(async () => {
    setDesligando(true);
    setAvisoAcao(null);
    try {
      const r = await fetch("/api/camera/desligar", { method: "POST" });
      if (!r.ok) {
        const corpo = (await r.json().catch(() => null)) as { erro?: string } | null;
        setAvisoAcao(corpo?.erro ?? "Não foi possível desligar a câmera.");
      }
      await buscar();
    } catch {
      setAvisoAcao("Não foi possível desligar a câmera. Verifique a conexão com o notebook da sala.");
    } finally {
      setDesligando(false);
    }
  }, [buscar]);

  // "Iniciando": ou clicamos ligar e o backend ainda nao confirmou rodando:true,
  // ou o proprio backend sinaliza iniciando:true (processo subiu, boot dos
  // modelos ainda nao escreveu o primeiro estado). O segundo caso cobre um
  // reload no meio do boot, sem depender do estado local `ligando`.
  const iniciando =
    (ligando && !estado?.rodando) ||
    (!!estado && !estado.rodando && estado.iniciando === true);

  return (
    <div className="flex flex-col gap-7">
      <div>
        <h1
          className="text-text text-2xl font-semibold sm:text-3xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Câmera
        </h1>
        <p className="text-text-body mt-1.5 text-sm">
          Ligue a captura da sala para acompanhar presença e atenção da turma ao vivo.
        </p>
      </div>

      {avisoRede && (
        <div
          className="rounded-xl border px-4 py-3 text-sm font-semibold"
          style={{
            background: "var(--warn-bg)",
            borderColor: "var(--warn)",
            color: "var(--warn-fg)",
          }}
          role="status"
        >
          {avisoRede}
        </div>
      )}

      {estado?.rodando ? (
        <VistaRodando
          estado={estado}
          desligando={desligando}
          aoDesligar={desligar}
          aviso={avisoAcao}
          modos={modosDisponiveis}
          modoAtivo={modoAtivo}
          modoPendente={modoPendente}
          aoTrocarModo={trocarModo}
          audioGravando={audioGravando}
          audioPendente={audioPendente}
          aoAlternarAudio={alternarAudio}
        />
      ) : (
        <VistaParada
          iniciando={iniciando}
          ligando={ligando}
          aoLigar={ligar}
          aviso={avisoAcao}
          turmas={turmas}
          turmaEscolhida={turmaEscolhida}
          aoEscolherTurma={setTurmaEscolhida}
          modos={modosDisponiveis}
          modoInicial={modoInicial}
          aoEscolherModo={setModoInicial}
          audioInicial={audioInicial}
          aoEscolherAudio={setAudioInicial}
        />
      )}
    </div>
  );
}

type VistaParadaProps = {
  iniciando: boolean;
  ligando: boolean;
  aoLigar: () => void;
  aviso: string | null;
  turmas: Turma[];
  turmaEscolhida: string;
  aoEscolherTurma: (valor: string) => void;
  modos: ModoCameraInfo[];
  modoInicial: ModoCamera;
  aoEscolherModo: (modo: ModoCamera) => void;
  audioInicial: boolean;
  aoEscolherAudio: (v: boolean) => void;
};

/** Estados 1 (parada) e 2 (iniciando) — nenhuma captura rodando ainda. */
function VistaParada({
  iniciando,
  ligando,
  aoLigar,
  aviso,
  turmas,
  turmaEscolhida,
  aoEscolherTurma,
  modos,
  modoInicial,
  aoEscolherModo,
  audioInicial,
  aoEscolherAudio,
}: VistaParadaProps) {
  return (
    <div
      className="border-border-default bg-surface shadow-card mx-auto flex w-full max-w-lg flex-col items-center gap-5 rounded-[12px] border p-10 text-center"
    >
      <div
        className="flex h-16 w-16 items-center justify-center rounded-full"
        style={{ background: iniciando ? "var(--warn-bg)" : "var(--surface-2)" }}
        aria-hidden
      >
        <span style={{ color: iniciando ? "var(--warn-fg)" : "var(--text-muted)" }}>
          <IconCamera size={30} />
        </span>
      </div>

      {iniciando ? (
        <>
          <div>
            <h2 className="text-text text-lg font-semibold">Iniciando…</h2>
            <p className="text-text-muted mt-1 text-sm leading-relaxed">
              Carregando os modelos de reconhecimento. Isso leva alguns segundos.
            </p>
          </div>
          <span
            className="h-1.5 w-40 overflow-hidden rounded-full"
            style={{ background: "var(--surface-2)" }}
            aria-hidden
          >
            <span
              className="block h-full w-1/3 animate-pulse rounded-full"
              style={{ background: "var(--warn)" }}
            />
          </span>
          <span className="sr-only" role="status">
            Iniciando a câmera, aguarde.
          </span>
        </>
      ) : (
        <>
          <div>
            <h2 className="text-text text-lg font-semibold">Câmera parada</h2>
            <p className="text-text-muted mt-1 text-sm leading-relaxed">
              Nenhuma captura em andamento nesta sala.
            </p>
          </div>

          {/* Seletor de turma: por padrao "Automatico" (o backend cruza sala +
              horario). Escolher uma turma da lista forca aquela aula — util pra
              apresentar sem depender do horario real. So' aparece se ha turmas. */}
          <label className="flex w-full flex-col gap-1.5 text-left">
            <span className="bloco-cam-rotulo">Turma a iniciar</span>
            <select
              value={turmaEscolhida}
              onChange={(evento) => aoEscolherTurma(evento.target.value)}
              disabled={ligando || turmas.length === 0}
              className="border-border-default bg-surface text-text focus:border-primary w-full rounded-xl border px-4 py-2.5 text-sm font-semibold outline-none transition-colors disabled:opacity-60"
            >
              <option value="">Automático (por horário)</option>
              {turmas.map((turma) => (
                <option key={turma.id} value={String(turma.id)}>
                  {rotuloDaTurma(turma)}
                </option>
              ))}
            </select>
          </label>

          {/* Modo inicial: a escolha vive aqui, no momento em que importa, e
              nao numa preferencia guardada — decisao do usuario em 28/07/2026.
              Toda captura comeca em Aula a menos que ele mude isto agora. */}
          <div className="flex w-full flex-col gap-1.5 text-left">
            <span className="bloco-cam-rotulo">Modo inicial</span>
            <SeletorModo
              modos={modos}
              ativo={modoInicial}
              desabilitado={ligando}
              aoEscolher={aoEscolherModo}
            />
          </div>

          {/* Microfone antes de ligar: a escolha vale pra esta captura, e o
              valor inicial vem das Configuracoes. Aqui o controle NAO fala com
              a API — so' guarda a escolha, aplicada no Ligar. */}
          <div className="w-full">
            <ControleMicrofone
              gravando={audioInicial}
              desabilitado={ligando}
              aindaNaoIniciou
              aoAlternar={aoEscolherAudio}
            />
          </div>

          <button
            type="button"
            onClick={aoLigar}
            disabled={ligando}
            /* `--text-on-brand`, e nao `text-white`: no tema escuro a tinta e'
               CLARA (#d9c8ee), e texto branco em cima dela fica ilegivel. */
            className="w-full rounded-[9px] px-8 py-3 text-sm font-semibold transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            style={{
              background: "var(--primary)",
              color: "var(--text-on-brand)",
            }}
          >
            {ligando ? "Ligando…" : "Ligar"}
          </button>
        </>
      )}

      {/* Durante "Iniciando…" nao mostramos aviso: o boot dos modelos leva
          alguns segundos e um erro transitorio do proxy (backend ainda subindo)
          nao deve piscar por cima da mensagem de carregando. O aviso so'
          reaparece se a camera voltar pra "parada" com um erro real. */}
      {aviso && !iniciando && (
        <p className="text-text-muted text-xs font-semibold" role="status">
          {aviso}
        </p>
      )}
    </div>
  );
}

type VistaRodandoProps = {
  estado: Extract<EstadoCamera, { rodando: true }>;
  desligando: boolean;
  aoDesligar: () => void;
  aviso: string | null;
  modos: ModoCameraInfo[];
  modoAtivo: ModoCamera;
  modoPendente: ModoCamera | null;
  aoTrocarModo: (modo: ModoCamera) => void;
  /** Gravando de fato, segundo a captura (nao o que foi clicado). */
  audioGravando: boolean;
  audioPendente: boolean | null;
  aoAlternarAudio: (ativo: boolean) => void;
};

/** Estados 3 (rodando com aula) e 4 (rodando sem aula) — captura ativa. */
function VistaRodando({
  estado,
  desligando,
  aoDesligar,
  aviso,
  modos,
  modoAtivo,
  modoPendente,
  aoTrocarModo,
  audioGravando,
  audioPendente,
  aoAlternarAudio,
}: VistaRodandoProps) {
  // "Tem aula" exige turma E sessao. Usamos o proprio nome da turma como prova:
  // num render transitorio logo apos ligar, o estado pode chegar com sessao_id
  // ja preenchido mas turma ainda nula/ausente — checar so' `!= null` deixaria
  // passar `undefined` (undefined != null e' true) e o acesso a .nome estouraria.
  const nomeTurma = estado.turma?.nome ?? null;
  const temAula = estado.sessao_id !== null && nomeTurma !== null;
  // Defesa em profundidade: o backend so' manda rodando:true com estado
  // completo, mas se um estado parcial escapar, `?? 0` evita estourar num
  // .toFixed/aritmetica de undefined (o que quebrava a tela e exigia reload).
  // pct_desatento vem como fracao 0-1; * 100 vira porcentagem.
  const pctDispersao = Math.round((estado.pct_desatento ?? 0) * 100);
  const mediaPessoas = (estado.media_pessoas ?? 0).toFixed(1);
  const fpsTexto = estado.fps != null ? estado.fps.toFixed(1) : "Sem dado";
  // Fora do modo Aula a atencao nao e' medida. Sem esta checagem a tela
  // mostraria "0% disperso" como se fosse um resultado otimo, quando na
  // verdade nao ha medicao nenhuma. `?? true` cobre backend antigo, que so'
  // tinha o modo Aula.
  const medeAtencao = estado.mede_atencao ?? true;

  // Ha quanto tempo a captura esta no ar. `agora` re-renderiza a cada 30s pro
  // texto nao congelar em "há 24 min" o resto da aula: o polling do estado
  // atualiza os NUMEROS, mas `iniciada_em` nao muda, entao sem este relogio
  // proprio a duracao so' avancaria quando outro dado mudasse.
  const [agora, setAgora] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setAgora(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);
  const duracao = duracaoDesde(estado.iniciada_em, agora);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-text-muted m-0 text-[13px]">
        Acompanhe presença e atenção da turma ao vivo enquanto a captura roda.
      </p>

      {/* ---- FAIXA "AO VIVO" ---- */}
      <section className="border-border-default bg-surface shadow-card faixa-vivo rounded-[12px] border">
        <span className="vivo-ponto" aria-hidden />
        <div className="vivo-texto">
          <p className="vivo-titulo text-text">
            Ao vivo{nomeTurma ? ` · ${nomeTurma}` : ""}
          </p>
          <p className="vivo-sub">
            {temAula
              ? "Câmera rodando com aula em andamento"
              : "Câmera rodando — sem turma neste horário"}
            {/* A duracao so' entra quando ha dado: sem `iniciada_em` (backend
                antigo, ou sala sem aula) a frase termina antes, em vez de
                mostrar um tempo inventado. */}
            {duracao && (
              <>
                {" · "}
                <span className="vivo-duracao">{duracao}</span>
              </>
            )}
          </p>
        </div>

        <button
          type="button"
          onClick={aoDesligar}
          disabled={desligando}
          className="btn-acao"
        >
          <IconFechar size={14} />
          {desligando ? "Desligando…" : "Desligar"}
        </button>
      </section>

      {/* ---- ALERTA DE DISPERSAO ----
          Sobe pro topo (antes ficava depois da lousa): e' o dado mais urgente
          da tela e precisa saltar aos olhos antes de qualquer controle.
          Ganhou acao embutida — so' avisar deixava o professor cacando o modo
          Descanso mais embaixo; agora o proprio alerta pausa a medicao. */}
      {estado.alerta_atencao && (
        <div className="alerta-dispersao" role="alert">
          <IconQueda size={18} />
          <span className="alerta-dispersao-texto">
            Mais de {LIMIAR_ALERTA_PCT}% da turma dispersa agora
          </span>
          <button
            type="button"
            className="alerta-dispersao-acao"
            onClick={() => aoTrocarModo("descanso")}
            disabled={modoPendente !== null}
          >
            {modoPendente === "descanso" ? "Pausando…" : "Pausar medição"}
          </button>
        </div>
      )}

      {/* ---- NUMEROS AO VIVO ----
          Sobem pro topo: sao o motivo de abrir a tela durante a aula (checar a
          turma), nao os controles de configuracao. */}
      <div className="numeros-cam">
        <CartaoNumero
          rotulo="Chamada"
          cor="roxo"
          valor={
            temAula
              ? `${estado.chamada?.presentes ?? 0}/${estado.chamada?.total ?? 0}`
              : "—"
          }
          nota={temAula ? "Presentes / total da turma" : "Sem aula neste horário"}
          icone={<IconPessoas size={18} />}
        />
        <CartaoNumero
          rotulo="Dispersão"
          cor="ambar"
          // Travessao em vez de "0%": sem medicao, zero seria mentira boa —
          // o professor leria como "turma toda atenta".
          valor={medeAtencao ? `${pctDispersao}%` : "—"}
          nota={
            medeAtencao
              ? "Turma olhando fora da aula agora"
              : "Não medida neste modo"
          }
          icone={<IconQueda size={18} />}
        />
        <CartaoNumero
          rotulo="Média de pessoas"
          cor="azul"
          valor={mediaPessoas}
          nota="Detectadas por quadro"
          icone={<IconPessoas size={18} />}
        />
        {/* FPS e MQTT sao diagnostico de captura, nao metrica pedagogica: no
            mesmo peso visual competiriam com Chamada e Dispersao. */}
        <CartaoNumero
          discreto
          rotulo="FPS"
          cor="verde"
          valor={fpsTexto}
          nota="Quadros por segundo da captura"
          icone={<IconRaio size={16} />}
        />
        <CartaoNumero
          discreto
          rotulo="MQTT"
          cor="verde"
          valor={estado.mqtt ? "Conectado" : "Sem conexão"}
          nota="Envio dos sensores"
          icone={<IconRelogio size={16} />}
        />
      </div>

      {/* ---- MODO DA AULA ---- */}
      <section className="border-border-default bg-surface shadow-card bloco-cam rounded-[12px] border">
        <div className="bloco-cam-topo">
          <span className="bloco-cam-rotulo">Modo da aula</span>
          {!medeAtencao && (
            <span className="bloco-cam-aviso">
              Atenção da turma não está sendo medida
            </span>
          )}
          <span className={medeAtencao ? "bloco-cam-ajuda" : undefined}>
            <DicaAjuda
              texto="Define o que a câmera mede e quais capturas ficam disponíveis."
              rotulo="O que muda entre os modos"
              lado="esquerda"
            />
          </span>
        </div>
        <SeletorModo
          modos={modos}
          ativo={modoAtivo}
          pendente={modoPendente}
          aoEscolher={aoTrocarModo}
        />
      </section>

      {/* ---- MICROFONE ---- */}
      <ControleMicrofone
        gravando={audioGravando}
        pendente={audioPendente}
        aoAlternar={aoAlternarAudio}
      />

      {/* ---- QUADRO DA AULA ----
          SO' no modo Lousa. Guardar imagem e' excecao autorizada apenas nesse
          modo (CLAUDE.md do backend), entao um botao visivel fora dele
          prometeria algo que a API recusa com 409.

          Sai da tela na troca de modo junto com a possibilidade de capturar —
          e as fotos ja' guardadas continuam na aula, visiveis no relatorio. */}
      {modoAtivo === "lousa" && (
        <PainelLousa
          sessaoId={estado.sessao_id ?? null}
          desabilitado={modoPendente !== null && modoPendente !== modoAtivo}
        />
      )}

      {aviso && (
        <p className="text-text-muted text-xs font-semibold" role="status">
          {aviso}
        </p>
      )}
    </div>
  );
}
