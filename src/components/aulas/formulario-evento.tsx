"use client";

import { useState } from "react";

import { Modal } from "@/components/ui/modal";
import type {
  Aula,
  EventoDaAgenda,
  NovoEventoDaAgenda,
  TipoDeEvento,
  Turma,
} from "@/lib/types";

/**
 * Evento da agenda, num modal centrado.
 *
 * A DATA NAO E' UM CAMPO: ela vem da coluna onde o formulario foi aberto, o que
 * elimina o erro de escolher a data errada num seletor depois de ter clicado no
 * dia certo.
 *
 * A TURMA E' UM CAMPO, mas so' na agenda consolidada (29/08/2026): la' nao ha'
 * seletor de turma no topo pra herdar, e antes disso todo evento criado em
 * "todas as turmas" nascia pessoal, sem jeito de dizer de quem ele era. Dentro
 * de uma turma o campo nao aparece — a resposta ja' esta na tela.
 *
 * As opcoes de tipo mudam conforme o dia TEM aula ou nao: 'cancelada' precisa
 * de uma aula pra riscar, e oferecer a opcao num dia vazio criaria um caminho
 * que so' falha no envio.
 */

const ESTILO_CAMPO =
  "bg-surface-2 border-border-default text-text placeholder:text-text-muted w-full rounded-[9px] border px-[11px] py-[9px] text-[13px] outline-none focus:outline-2 focus:-outline-offset-1 focus:outline-[var(--primary-hover)] disabled:opacity-50";

const ROTULO = "text-text-muted text-[10px] font-bold tracking-[0.1em] uppercase";

/** Rotulo de cada tipo, na ordem em que aparecem. */
const ROTULOS: { id: TipoDeEvento; rotulo: string; ajuda: string }[] = [
  { id: "nota", rotulo: "Nota", ajuda: "Um lembrete no dia" },
  { id: "prova", rotulo: "Prova", ajuda: "Destaca o dia" },
  { id: "cancelada", rotulo: "Aula cancelada", ajuda: "Risca uma aula" },
  { id: "extra", rotulo: "Aula extra", ajuda: "Aula fora da grade" },
];

const MAXIMO_TITULO = 120;

/** "2026-08-24" -> "segunda-feira, 24 de agosto". */
function porExtenso(data: string) {
  const [ano, mes, dia] = data.split("-").map(Number);
  // Meio-dia, e nao meia-noite: `new Date(a, m, d)` monta no fuso local, e
  // qualquer deslocamento na hora zero cairia no dia anterior.
  return new Date(ano, mes - 1, dia, 12).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

type Props = {
  /** "AAAA-MM-DD" da coluna onde o formulario abriu. */
  data: string;
  /**
   * Turma da agenda. null = agenda consolidada — e' o caso em que o seletor de
   * turma aparece, porque nao ha' turma pra herdar da tela.
   */
  turmaId: number | null;
  /** Turmas pro seletor. So' usado quando `turmaId` e' null. */
  turmas?: Turma[];
  /** Aulas deste dia, pro seletor do tipo 'cancelada'. */
  aulasDoDia: Aula[];
  /** Evento sendo editado; ausente = criando. */
  evento?: EventoDaAgenda | null;
  aoCancelar: () => void;
  /** Rejeita com Error(mensagem) — o modal mostra o texto e fica aberto. */
  aoSalvar: (dados: NovoEventoDaAgenda) => Promise<void>;
  /** Ausente quando criando: so' evento existente pode ser apagado. */
  aoApagar?: () => Promise<void>;
};

export function FormularioEvento({
  data,
  turmaId,
  turmas = [],
  aulasDoDia,
  evento,
  aoCancelar,
  aoSalvar,
  aoApagar,
}: Props) {
  const editando = Boolean(evento);

  const [tipo, setTipo] = useState<TipoDeEvento>(evento?.tipo ?? "nota");
  const [titulo, setTitulo] = useState(evento?.titulo ?? "");
  const [descricao, setDescricao] = useState(evento?.descricao ?? "");
  const [aulaId, setAulaId] = useState<number | null>(
    evento?.aula_id ?? aulasDoDia[0]?.id ?? null,
  );
  // Na agenda consolidada o evento comeca PESSOAL (sem turma): boa parte do que
  // se anota ali — reuniao, conselho — nao pertence a turma nenhuma.
  const [turmaEscolhida, setTurmaEscolhida] = useState<number | null>(
    evento?.turma_id ?? turmaId,
  );

  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Sem turma no topo da tela, o professor escolhe aqui.
  const mostrarSeletorDeTurma = turmaId === null && turmas.length > 0;

  // 'cancelada' precisa de uma aula pra riscar. Num dia sem aula a opcao nao
  // aparece — melhor nao oferecer que oferecer e recusar no envio.
  const tiposDisponiveis = ROTULOS.filter(
    (item) => item.id !== "cancelada" || aulasDoDia.length > 0,
  );

  const precisaDeAula = tipo === "cancelada";
  const podeSalvar =
    titulo.trim() !== "" && !salvando && (!precisaDeAula || aulaId !== null);

  async function enviar(evt: React.FormEvent) {
    evt.preventDefault();
    if (!podeSalvar) return;

    setSalvando(true);
    setErro(null);
    try {
      await aoSalvar({
        data,
        tipo,
        titulo: titulo.trim(),
        descricao: descricao.trim(),
        turma_id: turmaEscolhida,
        // aula_id so' vai nos tipos que falam de uma aula. Mandar em 'nota'
        // amarraria o lembrete a uma aula que ele nao comenta.
        aula_id: precisaDeAula ? aulaId : null,
      });
    } catch (causa) {
      setErro(
        causa instanceof Error
          ? causa.message
          : "Não foi possível salvar o evento.",
      );
      setSalvando(false);
    }
  }

  async function apagar() {
    if (!aoApagar) return;
    setSalvando(true);
    setErro(null);
    try {
      await aoApagar();
    } catch (causa) {
      setErro(
        causa instanceof Error
          ? causa.message
          : "Não foi possível apagar o evento.",
      );
      setSalvando(false);
    }
  }

  return (
    <Modal
      aberto
      titulo={editando ? "Editar evento" : "Novo evento"}
      subtitulo={porExtenso(data)}
      largura="grande"
      ocupado={salvando}
      aoFechar={aoCancelar}
      rodape={
        <>
          {/* Apagar fica na PONTA ESQUERDA, longe de Salvar: e' a acao
              destrutiva, e vizinha do botao mais clicado ela vira erro de mira. */}
          {aoApagar && (
            <button
              type="button"
              onClick={() => void apagar()}
              disabled={salvando}
              className="mr-auto rounded-[9px] px-3 py-2.5 text-[13px] font-semibold disabled:opacity-40"
              style={{ color: "var(--danger-fg)" }}
            >
              Apagar evento
            </button>
          )}
          <button
            type="button"
            onClick={aoCancelar}
            disabled={salvando}
            className="bg-surface-2 border-border-default text-text-body rounded-[9px] border px-4 py-2.5 text-[13px] font-semibold disabled:opacity-40"
          >
            Cancelar
          </button>
          {/* `form=` liga o botao ao formulario mesmo estando FORA dele: o
              rodape do modal e' irmao da area que rola, nao filho do form. */}
          <button
            type="submit"
            form="formulario-evento"
            disabled={!podeSalvar}
            className="flex items-center justify-center gap-2 rounded-[9px] px-5 py-2.5 text-[13px] font-semibold transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
            // --text-on-brand, e nao text-white fixo: no tema escuro --primary
            // e' um lilas CLARO, e texto branco sobre ele fica ilegivel.
            style={{ background: "var(--primary)", color: "var(--text-on-brand)" }}
          >
            {salvando && (
              <span
                aria-hidden
                className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current/40 border-t-current"
              />
            )}
            {salvando ? "Salvando…" : editando ? "Salvar" : "Criar"}
          </button>
        </>
      }
    >
      <form
        id="formulario-evento"
        onSubmit={enviar}
        className="flex flex-col gap-4 pb-2"
        noValidate
      >
        <div className="flex flex-col gap-1.5">
          <label htmlFor="evento-tipo" className={ROTULO}>
            Tipo
          </label>
          <select
            id="evento-tipo"
            value={tipo}
            onChange={(e) => setTipo(e.target.value as TipoDeEvento)}
            disabled={salvando}
            className={`${ESTILO_CAMPO} cursor-pointer`}
          >
            {tiposDisponiveis.map((item) => (
              <option key={item.id} value={item.id}>
                {item.rotulo} — {item.ajuda}
              </option>
            ))}
          </select>
        </div>

        {mostrarSeletorDeTurma && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="evento-turma" className={ROTULO}>
              Turma
            </label>
            <select
              id="evento-turma"
              value={turmaEscolhida ?? ""}
              onChange={(e) =>
                setTurmaEscolhida(e.target.value ? Number(e.target.value) : null)
              }
              disabled={salvando}
              className={`${ESTILO_CAMPO} cursor-pointer`}
            >
              <option value="">Sem turma (só na minha agenda)</option>
              {turmas.map((turma) => (
                <option key={turma.id} value={turma.id}>
                  {turma.nome}
                </option>
              ))}
            </select>
          </div>
        )}

        {precisaDeAula && aulasDoDia.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="evento-aula" className={ROTULO}>
              Qual aula não acontece
            </label>
            <select
              id="evento-aula"
              value={aulaId ?? ""}
              onChange={(e) => setAulaId(Number(e.target.value))}
              disabled={salvando}
              className={`${ESTILO_CAMPO} cursor-pointer`}
            >
              {aulasDoDia.map((aula) => (
                <option key={aula.id} value={aula.id}>
                  {aula.hora_inicio} {aula.materia_nome ?? "Sem matéria"}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label htmlFor="evento-titulo" className={ROTULO}>
            {tipo === "cancelada" ? "Motivo" : "Título"}
          </label>
          <input
            id="evento-titulo"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            maxLength={MAXIMO_TITULO}
            placeholder={
              tipo === "cancelada" ? "Feriado, conselho…" : "Prova do 3º bimestre"
            }
            // autoFocus: o modal abriu por um clique deliberado no dia, e o
            // proximo passo e' sempre digitar.
            autoFocus
            disabled={salvando}
            className={ESTILO_CAMPO}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="evento-descricao" className={ROTULO}>
            Detalhes (opcional)
          </label>
          <textarea
            id="evento-descricao"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            rows={3}
            disabled={salvando}
            placeholder="O que mais precisa lembrar sobre este dia"
            className={`${ESTILO_CAMPO} resize-y`}
          />
        </div>

        {erro && (
          <p
            className="rounded-xl px-4 py-3 text-[13px] font-semibold"
            style={{ background: "var(--danger-bg)", color: "var(--danger-fg)" }}
            role="alert"
          >
            {erro}
          </p>
        )}
      </form>
    </Modal>
  );
}
