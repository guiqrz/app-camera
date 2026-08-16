"use client";

import { DicaAjuda } from "@/components/ui/dica-ajuda";
import { IconMicrofone, IconMicrofoneCortado } from "@/components/ui/icons";

type ControleMicrofoneProps = {
  /**
   * Se a camera esta GRAVANDO de fato (vem do polling do estado), nao o que foi
   * clicado. E' isto que pinta a faixa vermelha — a tela nunca diz "gravando"
   * antes de a captura confirmar.
   */
  gravando: boolean;
  /**
   * Ultimo valor pedido que o polling ainda nao confirmou, ou null. Some
   * sozinho quando `gravando` alcanca o valor pedido.
   */
  pendente?: boolean | null;
  /** Desliga o controle (troca em curso, ou camera fora do ar). */
  desabilitado?: boolean;
  /**
   * true na VistaParada: `gravando` aqui e' so' a ESCOLHA do professor pra
   * quando a camera ligar, nunca uma gravacao em curso (a camera esta
   * desligada, entao nada esta sendo capturado). Muda a faixa de aviso e o
   * rotulo pra nao afirmar algo falso — ver bug reportado em 31/07/2026.
   */
  aindaNaoIniciou?: boolean;
  aoAlternar: (ativo: boolean) => void;
};

/**
 * Liga/desliga a gravacao de audio da aula, com aviso visivel enquanto grava.
 *
 * Por que o aviso e' uma faixa cheia e nao um selo discreto: gravar audio de
 * uma sala com menores de idade nao pode passar despercebido. O contrato de
 * privacidade do projeto (ver CLAUDE.md do backend) exige que o professor VEJA
 * que esta gravando — um indicador que se confunde com decoracao nao cumpre
 * isso. Por isso a faixa usa cor de perigo cheia, ponto pulsante e `role=status`
 * pra leitor de tela anunciar a mudanca.
 *
 * O estado nunca depende so' de cor (WCAG 1.4.1): o icone muda (microfone
 * cortado quando desligado) e o texto diz o estado por escrito.
 *
 * Na VistaParada (`aindaNaoIniciou`), `gravando` e' so' a escolha pro proximo
 * Ligar — a faixa de perigo cheia (que afirma captura em curso) da lugar a um
 * aviso mais contido em `--warn`, coerente com o resto da tela parada (o icone
 * de "Iniciando…" tambem usa `--warn`).
 */
export function ControleMicrofone({
  gravando,
  pendente = null,
  desabilitado = false,
  aindaNaoIniciou = false,
  aoAlternar,
}: ControleMicrofoneProps) {
  // Pendente so' vale enquanto discorda da realidade: assim que o polling
  // confirma, o rotulo volta ao normal sozinho.
  const aguardando = pendente !== null && pendente !== gravando;
  // O clique pede o OPOSTO do que esta valendo de fato — nunca o oposto do que
  // foi pedido, senao dois cliques rapidos se anulariam.
  const proximoValor = !gravando;

  return (
    <div className="border-border-default bg-surface shadow-card bloco-cam rounded-[12px] border">
      <div className="bloco-cam-topo">
        <span className="bloco-cam-rotulo">Microfone da aula</span>
        <span className="bloco-cam-ajuda">
        <DicaAjuda
          texto={
            "Grava o áudio da aula para gerar a transcrição depois que a aula termina. " +
            "O áudio é apagado assim que a transcrição fica pronta, e a transcrição " +
            "expira em 60 dias. Só você vê — nenhuma tela de coordenação mostra."
          }
          rotulo="O que a gravação de áudio faz"
          lado="esquerda"
        />
        </span>
      </div>

      {/* Faixa de gravacao em curso: cor de perigo cheia, igual ao alerta de
          dispersao. So' aparece com confirmacao POSITIVA da captura — nunca
          na tela parada, onde nada esta sendo gravado de fato. */}
      {gravando && !aindaNaoIniciou && (
        <div className="mic-linha" role="status">
          <span className="vivo-ponto" aria-hidden />
          <p className="mic-texto">
            Gravando áudio da aula
            <span>O áudio é apagado assim que a transcrição fica pronta.</span>
          </p>
        </div>
      )}

      {/* Faixa "preparado, ainda nao ativo": so' na VistaParada com o
          microfone marcado. Usa `--warn` (nao `--danger`) porque nada esta
          sendo capturado ainda — cor de perigo aqui afirmaria uma gravacao
          que nao existe. `role=status` porque e' um aviso de privacidade
          relevante, mesmo sem ser urgente. */}
      {gravando && aindaNaoIniciou && (
        <div className="mic-linha pre-inicio" role="status">
          <span aria-hidden>
            <IconMicrofone size={16} />
          </span>
          <p className="mic-texto">
            Microfone ativado
            <span>
              Quando a câmera iniciar, o áudio da aula passa a ser gravado. O
              áudio é apagado assim que a transcrição fica pronta.
            </span>
          </p>
        </div>
      )}

      {/* Cor do switch: perigo cheio so' quando a gravacao esta valendo de
          fato (VistaRodando). Na VistaParada, marcado usa `--warn` — mesma
          logica da faixa acima, o switch nao pode gritar "perigo" por algo
          que ainda nao esta acontecendo. */}
      <button
        type="button"
        role="switch"
        aria-checked={gravando}
        disabled={desabilitado || aguardando}
        onClick={() => aoAlternar(proximoValor)}
        /* `ligado` pinta o trilho de vermelho; `pre-inicio` troca pra ambar,
           porque antes de a captura comecar nada esta sendo gravado ainda. */
        className={`mic-switch${gravando ? " ligado" : ""}${
          gravando && aindaNaoIniciou ? " pre-inicio" : ""
        }`}
        style={
          gravando
            ? {
                borderColor: aindaNaoIniciou ? "var(--warn)" : "var(--danger)",
                background: aindaNaoIniciou ? "var(--warn-bg)" : "var(--danger-bg)",
              }
            : undefined
        }
      >
        <span className="mic-switch-rotulo">
          <span
            aria-hidden
            style={{
              color: gravando
                ? aindaNaoIniciou
                  ? "var(--warn-fg)"
                  : "var(--danger-fg)"
                : "var(--text-muted)",
            }}
          >
            {gravando ? <IconMicrofone size={16} /> : <IconMicrofoneCortado size={16} />}
          </span>
          <span
            style={{
              color: gravando
                ? aindaNaoIniciou
                  ? "var(--warn-fg)"
                  : "var(--danger-fg)"
                : "var(--text)",
            }}
          >
            {aguardando
              ? "Aplicando…"
              : gravando
                ? "Microfone ligado"
                : "Microfone desligado"}
          </span>
        </span>

        {/* Trilho do switch. `aria-hidden` porque o estado ja' vai no
            aria-checked do botao — o leitor de tela nao precisa do desenho. */}
        <span aria-hidden className="mic-trilho" />
      </button>

      {!gravando && (
        <p className="text-text-muted text-xs leading-relaxed">
          Desligado. Nenhum áudio da sala está sendo capturado.
        </p>
      )}
    </div>
  );
}
