"use client";

import { IconAlerta, IconClipe, IconLousa } from "@/components/ui/icons";
import type { EventoDaAgenda, TipoDeEvento } from "@/lib/types";

/**
 * Os eventos com data de UM dia, dentro da coluna dele na agenda.
 *
 * POR QUE ESTES BLOCOS EXISTEM: a grade (`aulas`) guarda dia da semana, nunca
 * data — ela se repete identica pra sempre. Estes eventos sao o que faz esta
 * segunda ser diferente da proxima: a prova, o feriado, a reuniao.
 *
 * O 'cancelada' aparece aqui TAMBEM, e nao so' riscando a aula: o bloco riscado
 * mostra que a aula nao acontece, e este mostra POR QUE.
 */

/** Como cada tipo se apresenta. Fechado junto com TipoDeEvento em types.ts. */
const APARENCIA: Record<
  TipoDeEvento,
  { fundo: string; texto: string; Icone: typeof IconClipe; rotulo: string }
> = {
  nota: {
    fundo: "var(--surface-2)",
    texto: "var(--text-body)",
    Icone: IconClipe,
    rotulo: "Nota",
  },
  prova: {
    fundo: "var(--materia-roxo-bg)",
    texto: "var(--materia-roxo-fg)",
    Icone: IconLousa,
    rotulo: "Prova",
  },
  cancelada: {
    fundo: "var(--warn-bg)",
    texto: "var(--warn-fg)",
    Icone: IconAlerta,
    rotulo: "Aula cancelada",
  },
  extra: {
    fundo: "var(--ok-bg)",
    texto: "var(--ok-fg)",
    Icone: IconLousa,
    rotulo: "Aula extra",
  },
};

type Props = {
  eventos: EventoDaAgenda[];
  /** Abre o evento pra editar. Ausente = a lista e' so' leitura. */
  aoAbrir?: (evento: EventoDaAgenda) => void;
};

export function EventosDoDia({ eventos, aoAbrir }: Props) {
  if (eventos.length === 0) return null;

  return (
    <div className="flex flex-col gap-[4px]">
      {eventos.map((evento) => {
        const aparencia = APARENCIA[evento.tipo];
        const { Icone } = aparencia;

        // O titulo do atributo `title` junta tudo que nao cabe no bloco: a
        // descricao inteira e a contagem de anexos.
        const detalhe = [
          aparencia.rotulo,
          evento.titulo,
          evento.descricao || null,
          evento.anexos > 0
            ? `${evento.anexos} ${evento.anexos === 1 ? "anexo" : "anexos"}`
            : null,
        ]
          .filter(Boolean)
          .join(" · ");

        const conteudo = (
          <>
            <Icone size={11} className="mt-[1px] flex-none opacity-80" />
            <span className="min-w-0 flex-1 break-words text-left">
              {evento.titulo}
            </span>
            {evento.anexos > 0 && (
              <span className="flex flex-none items-center gap-[2px] opacity-75">
                <IconClipe size={10} />
                {evento.anexos}
              </span>
            )}
          </>
        );

        const estilo = {
          background: aparencia.fundo,
          color: aparencia.texto,
        } as const;

        const classes =
          "flex items-start gap-[5px] rounded-[7px] px-[7px] py-[5px] text-[10.5px] leading-snug";

        // Botao so' quando ha' o que fazer ao clicar. Um <button> que nao age
        // e' um alvo de teclado que nao leva a lugar nenhum.
        return aoAbrir ? (
          <button
            key={evento.id}
            type="button"
            onClick={() => aoAbrir(evento)}
            title={detalhe}
            aria-label={`Editar: ${detalhe}`}
            className={`${classes} cursor-pointer transition-transform hover:-translate-y-px`}
            style={{ ...estilo, fontWeight: 550 }}
          >
            {conteudo}
          </button>
        ) : (
          <div
            key={evento.id}
            title={detalhe}
            className={classes}
            style={{ ...estilo, fontWeight: 550 }}
          >
            {conteudo}
          </div>
        );
      })}
    </div>
  );
}
