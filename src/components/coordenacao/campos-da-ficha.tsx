"use client";

import { IconCheckSimples } from "@/components/ui/icons";
import type { TipoDeApoio } from "@/lib/types";

/**
 * Os campos da ficha do aluno, pra usar dentro de um formulario maior.
 *
 * DUAS CAMADAS, e a separacao importa (29/08/2026):
 *
 *   1. A DESCRICAO vale pra QUALQUER aluno. "Chega adiantado", "produz melhor
 *      em dupla" — nao e' laudo, e' o que o professor sabe de quem esta na
 *      frente dele. Fica sempre visivel.
 *   2. TIPO DE APOIO e ADAPTACOES so' aparecem depois de "Condicoes especiais?
 *      Sim". Sao DADO SENSIVEL (LGPD art. 5o, II) e a maioria dos alunos nao
 *      tem nenhum — mostrar nove caixas de laudo pra todo mundo faria o
 *      cadastro parecer um formulario clinico.
 *
 * AS TRAVAS estao no backend (ver gestao/fichas.py) e NENHUMA muda aqui:
 * nunca cruza com engajamento, nunca sai no diario, nunca entra em texto de
 * IA, nunca e' exportada, ve quem da' aula pra turma e a coordenacao.
 *
 * O QUE ESTES CAMPOS NAO SAO: espaco pra diagnostico clinico, medicacao,
 * historico medico ou laudo digitalizado. Isso e' prontuario, vive na
 * secretaria da escola, e o professor nao precisa ver pra dar aula. Os limites
 * de caracteres existem justamente pra desencorajar quem tentar.
 */

export const ROTULOS_DE_APOIO: Record<TipoDeApoio, string> = {
  tdah: "TDAH",
  tea: "TEA",
  dislexia: "Dislexia",
  discalculia: "Discalculia",
  deficiencia_visual: "Deficiência visual",
  deficiencia_auditiva: "Deficiência auditiva",
  deficiencia_fisica: "Deficiência física",
  altas_habilidades: "Altas habilidades",
  outro: "Outro",
};

export const TIPOS_DE_APOIO = Object.keys(ROTULOS_DE_APOIO) as TipoDeApoio[];

/** Espelha LIMITE_DESCRICAO em cupcam/gestao/fichas.py. */
export const MAXIMO_DESCRICAO = 1000;

/** Espelha LIMITE_ADAPTACOES em cupcam/gestao/fichas.py. */
export const MAXIMO_ADAPTACOES = 2000;

export type ValoresDaFicha = {
  tipos_de_apoio: TipoDeApoio[];
  descricao: string;
  adaptacoes: string;
};

export const FICHA_VAZIA: ValoresDaFicha = {
  tipos_de_apoio: [],
  descricao: "",
  adaptacoes: "",
};

/** Verdadeiro quando nao ha nada pra gravar — nesse caso a ficha e' APAGADA. */
export function fichaEstaVazia(valores: ValoresDaFicha) {
  return (
    valores.tipos_de_apoio.length === 0 &&
    valores.descricao.trim() === "" &&
    valores.adaptacoes.trim() === ""
  );
}

/** O aluno ja' tem algo na parte sensivel da ficha? */
function temApoio(valores: ValoresDaFicha) {
  return valores.tipos_de_apoio.length > 0 || valores.adaptacoes.trim() !== "";
}

const ESTILO_CAMPO =
  "bg-surface-2 border-border-default text-text placeholder:text-text-muted w-full rounded-[9px] border px-[11px] py-[9px] text-[13px] outline-none focus:outline-2 focus:-outline-offset-1 focus:outline-[var(--primary-hover)] disabled:opacity-50";

const ROTULO = "text-text-muted text-[10px] font-bold tracking-[0.1em] uppercase";

function Contador({ atual, maximo }: { atual: number; maximo: number }) {
  const perto = atual > maximo - 100;
  return (
    <span
      className="self-end text-[10px] tabular-nums"
      style={{
        color: perto ? "var(--warn-fg)" : "var(--text-muted)",
        fontWeight: perto ? 600 : 400,
      }}
    >
      {atual}/{maximo}
    </span>
  );
}

type Props = {
  valores: ValoresDaFicha;
  aoMudar: (valores: ValoresDaFicha) => void;
  /**
   * A opcao "condicoes especiais" esta marcada?
   *
   * Mora no MODAL, e nao aqui: e' ela que decide o que vai ser GRAVADO (ver
   * `fichaParaEnviar`), e estado de decisao nao pode viver so' dentro do
   * componente que o exibe.
   */
  temCondicao: boolean;
  aoResponder: (marcada: boolean) => void;
  desabilitado?: boolean;
};

export function CamposDaFicha({
  valores,
  aoMudar,
  temCondicao,
  aoResponder,
  desabilitado = false,
}: Props) {
  function alternarTipo(tipo: TipoDeApoio) {
    const tem = valores.tipos_de_apoio.includes(tipo);
    aoMudar({
      ...valores,
      tipos_de_apoio: tem
        ? valores.tipos_de_apoio.filter((t) => t !== tipo)
        : [...valores.tipos_de_apoio, tipo],
    });
  }

  // Desmarcar NAO apaga nada na hora. Se apagasse, um clique errado destruiria
  // a ficha de um aluno com laudo sem nenhuma confirmacao — e em dado sensivel
  // isso e' irreversivel pela tela. Os campos ficam escondidos, o aviso logo
  // abaixo diz que salvar assim e' que remove, e `fichaParaEnviar` so' limpa
  // no ENVIO.
  const mostrarApoio = temCondicao;
  // Desmarcado, mas o aluno TEM apoio guardado: salvar assim apaga. Precisa
  // estar dito antes de ele clicar em Salvar.
  const vaiRemoverApoio = !mostrarApoio && temApoio(valores);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="ficha-descricao" className={ROTULO}>
          Sobre o aluno (opcional)
        </label>
        <textarea
          id="ficha-descricao"
          value={valores.descricao}
          onChange={(evento) =>
            aoMudar({ ...valores, descricao: evento.target.value })
          }
          maxLength={MAXIMO_DESCRICAO}
          rows={3}
          disabled={desabilitado}
          placeholder="Chega adiantado, trava quando a sala fica barulhenta…"
          className={`${ESTILO_CAMPO} resize-y`}
        />
        <Contador atual={valores.descricao.length} maximo={MAXIMO_DESCRICAO} />
      </div>

      {/* A PERGUNTA. Ela separa o que vale pra todo aluno (acima) do que e'
          dado sensivel e vale pra poucos (abaixo).

          UM botao que liga e desliga, e nao o par Sim/Nao (29/08/2026): "Nao"
          e' o estado da maioria dos alunos, e um botao que ninguem clica ocupa
          espaco sem informar. Desmarcado ja' quer dizer "nao". */}
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={() => aoResponder(!mostrarApoio)}
          disabled={desabilitado}
          aria-pressed={mostrarApoio}
          className="flex w-fit cursor-pointer items-center gap-2.5 rounded-full py-[7px] pr-[18px] pl-[9px] text-[12.5px] font-semibold transition-colors disabled:opacity-50"
          style={{
            background: mostrarApoio ? "var(--primary)" : "var(--surface-2)",
            color: mostrarApoio ? "var(--text-on-brand)" : "var(--text-body)",
            border: `1px solid ${mostrarApoio ? "var(--primary)" : "var(--border)"}`,
          }}
        >
          {/* Caixa desenhada a mao: o `checked` nativo nao aceita cor da marca
              de forma confiavel entre navegadores. `aria-pressed` no botao ja'
              conta o estado pro leitor de tela. */}
          <span
            className="grid size-[17px] flex-none place-items-center rounded-[5px] transition-colors"
            style={{
              background: mostrarApoio
                ? "var(--text-on-brand)"
                : "transparent",
              border: `1.5px solid ${mostrarApoio ? "var(--text-on-brand)" : "var(--text-muted)"}`,
              color: "var(--primary)",
            }}
            aria-hidden
          >
            {mostrarApoio && <IconCheckSimples size={11} />}
          </span>
          Condições especiais
        </button>
      </div>

      {mostrarApoio && (
        <>
          <div className="flex flex-col gap-2">
            <span className={ROTULO}>Tipo de apoio</span>
            {/* Caixas de marcar, e nao um <select multiple>: o professor precisa
                ver as opcoes TODAS de uma vez pra reconhecer a que se aplica, e
                select multiplo esconde o resto e exige Ctrl pra marcar mais de
                uma. */}
            <div className="flex flex-wrap gap-1.5">
              {TIPOS_DE_APOIO.map((tipo) => {
                const marcado = valores.tipos_de_apoio.includes(tipo);
                return (
                  <label
                    key={tipo}
                    className="flex cursor-pointer items-center gap-1.5 rounded-full px-[11px] py-[5px] text-[12px] transition-colors"
                    style={{
                      background: marcado ? "var(--primary)" : "var(--surface-2)",
                      color: marcado
                        ? "var(--text-on-brand)"
                        : "var(--text-body)",
                      border: `1px solid ${marcado ? "var(--primary)" : "var(--border)"}`,
                      opacity: desabilitado ? 0.5 : 1,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={marcado}
                      onChange={() => alternarTipo(tipo)}
                      disabled={desabilitado}
                      className="sr-only"
                    />
                    {ROTULOS_DE_APOIO[tipo]}
                  </label>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="ficha-adaptacoes" className={ROTULO}>
              O que funciona com ele
            </label>
            <textarea
              id="ficha-adaptacoes"
              value={valores.adaptacoes}
              onChange={(evento) =>
                aoMudar({ ...valores, adaptacoes: evento.target.value })
              }
              maxLength={MAXIMO_ADAPTACOES}
              rows={3}
              disabled={desabilitado}
              placeholder="Prova em duas partes, instrucão escrita além da falada…"
              className={`${ESTILO_CAMPO} resize-y`}
            />
            <Contador
              atual={valores.adaptacoes.length}
              maximo={MAXIMO_ADAPTACOES}
            />
          </div>

          <p className="text-text-muted text-[11.5px] leading-relaxed">
            Estes dois campos ficam entre você e a coordenação. Não entram no
            diário, em relatórios nem em texto gerado pela Cup&nbsp;AI. Não
            escreva diagnóstico clínico, medicação nem histórico médico aqui —
            isso é prontuário e fica na secretaria.
          </p>
        </>
      )}

      {vaiRemoverApoio && (
        <p
          role="alert"
          className="rounded-lg px-3 py-2.5 text-[12px] leading-relaxed"
          style={{ background: "var(--warn-bg)", color: "var(--warn-fg)" }}
        >
          Este aluno tem apoio registrado. Ao salvar com a opção desmarcada, o
          tipo de apoio e as adaptações serão apagados.{" "}
          <button
            type="button"
            onClick={() => aoResponder(true)}
            className="font-semibold underline"
          >
            Ver o que está registrado
          </button>
        </p>
      )}
    </div>
  );
}

/**
 * O que o modal deve GRAVAR, dada a resposta da pergunta.
 *
 * Desmarcar limpa a parte sensivel — mas so' no envio, nunca no estado da
 * tela: enquanto o modal esta aberto o professor pode voltar atras sem ter
 * perdido nada.
 */
/** A opcao ja' nasce MARCADA quando o aluno tem apoio guardado. */
export function respostaInicial(valores: ValoresDaFicha): boolean {
  // Senao a ficha de quem TEM laudo abriria fechada e o professor acharia que
  // o dado sumiu.
  return temApoio(valores);
}

export function fichaParaEnviar(
  valores: ValoresDaFicha,
  temCondicao: boolean,
): ValoresDaFicha {
  if (!temCondicao) {
    return { ...valores, tipos_de_apoio: [], adaptacoes: "" };
  }
  return valores;
}
