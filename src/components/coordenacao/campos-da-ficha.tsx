"use client";

import type { TipoDeApoio } from "@/lib/types";

/**
 * Os tres campos da ficha de apoio, pra usar dentro de um formulario maior.
 *
 * DADO PESSOAL SENSIVEL (LGPD art. 5o, II) — a categoria mais protegida que
 * existe. As travas estao no backend (ver o docstring de gestao/fichas.py) e
 * NENHUMA delas pode ser afrouxada aqui:
 *
 *   - nunca cruza com engajamento;
 *   - nunca sai no diario de classe;
 *   - nunca entra em texto gerado por IA;
 *   - nunca e' exportada;
 *   - ve quem da' aula pra turma, e a coordenacao. So'.
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

/** O que a ficha guarda, do ponto de vista do formulario. */
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
  desabilitado?: boolean;
};

export function CamposDaFicha({ valores, aoMudar, desabilitado = false }: Props) {
  function alternarTipo(tipo: TipoDeApoio) {
    const tem = valores.tipos_de_apoio.includes(tipo);
    aoMudar({
      ...valores,
      tipos_de_apoio: tem
        ? valores.tipos_de_apoio.filter((t) => t !== tipo)
        : [...valores.tipos_de_apoio, tipo],
    });
  }

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

      <div className="flex flex-col gap-2">
        <span className={ROTULO}>Tipo de apoio (opcional)</span>
        {/* Caixas de marcar, e nao um <select multiple>: o professor precisa ver
            as opcoes TODAS de uma vez pra reconhecer a que se aplica, e select
            multiplo esconde o resto e exige Ctrl pra marcar mais de uma. */}
        <div className="flex flex-wrap gap-1.5">
          {TIPOS_DE_APOIO.map((tipo) => {
            const marcado = valores.tipos_de_apoio.includes(tipo);
            return (
              <label
                key={tipo}
                className="flex cursor-pointer items-center gap-1.5 rounded-full px-[11px] py-[5px] text-[12px] transition-colors"
                style={{
                  background: marcado ? "var(--primary)" : "var(--surface-2)",
                  color: marcado ? "var(--text-on-brand)" : "var(--text-body)",
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
          O que funciona com ele (opcional)
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
          placeholder="Prova em duas partes, instrucao escrita além da falada…"
          className={`${ESTILO_CAMPO} resize-y`}
        />
        <Contador atual={valores.adaptacoes.length} maximo={MAXIMO_ADAPTACOES} />
      </div>

      <p className="text-text-muted text-[11.5px] leading-relaxed">
        Estes campos ficam entre você e a coordenação. Não entram no diário, em
        relatórios nem em texto gerado pela Cup&nbsp;AI. Não escreva diagnóstico
        clínico, medicação nem histórico médico aqui — isso é prontuário e fica
        na secretaria.
      </p>
    </div>
  );
}
