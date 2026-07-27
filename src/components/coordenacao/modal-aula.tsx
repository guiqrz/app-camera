"use client";

import { useEffect, useId, useRef, useState } from "react";

import { useFocoPreso } from "@/components/coordenacao/usar-foco-preso";
import { IconFechar } from "@/components/ui/icons";
import type { Aula, Materia, NovaAula } from "@/lib/types";

type ModoModal = "criar" | "editar";

type ModalAulaProps = {
  aberto: boolean;
  modo: ModoModal;
  /** Aula sendo editada (obrigatorio no modo "editar"; ignorado no "criar"). */
  aula?: Aula | null;
  /** Materias cadastradas, pra popular o dropdown. Lista vazia e' valida. */
  materias: Materia[];
  aoFechar: () => void;
  /** Rejeita com Error(mensagem) — o modal mostra o texto e permanece aberto. */
  aoSalvar: (dados: NovaAula) => Promise<void>;
};

/** 0 = domingo ... 6 = sabado, mesma convencao de `Aula.dia_semana`. */
const DIAS_DA_SEMANA = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
];

/** Valor do <option> "Sem matéria" — vira `materia_id: null` no envio. */
const SEM_MATERIA = "";

const VALORES_INICIAIS = {
  dia_semana: "1",
  hora_inicio: "",
  hora_fim: "",
  materia_id: SEM_MATERIA,
};

/**
 * Modal de aula unificado — cria uma aula nova na turma ou edita uma
 * existente, decidido pelo prop `modo`. Mesmo molde do `ModalTurma`: overlay
 * escurecido + card centrado, Esc fecha, clique fora fecha, foco inicial no
 * primeiro campo, reset ao abrir.
 *
 * Validacao de fim > inicio replica a regra do backend
 * (`cupcam/gestao/aulas.py`) so' pra dar feedback rapido: "HH:MM" compara
 * certo como string porque tem sempre 5 caracteres com zero a esquerda. Ja o
 * conflito de horario com outra turma so' o backend sabe validar (precisa das
 * outras aulas da mesma sala) — vira um 409 que a vista repassa como Error e
 * cai no erro inline aqui.
 *
 * ATENCAO no modo editar: o PUT do backend e' substituicao TOTAL do recurso —
 * omitir `materia_id` LIMPA a materia da aula. Por isso o dropdown ja abre
 * pre-preenchido com a materia atual e o envio sempre manda `materia_id`
 * explicito (o id ou null), nunca omitido.
 */
export function ModalAula({
  aberto,
  modo,
  aula,
  materias,
  aoFechar,
  aoSalvar,
}: ModalAulaProps) {
  const [valores, setValores] = useState(VALORES_INICIAIS);
  const [erroValidacao, setErroValidacao] = useState<string | null>(null);
  const [erroApi, setErroApi] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const editando = modo === "editar";

  // Espelha `aberto` so' pra detectar a transicao fechado->aberto durante a
  // renderizacao (padrao oficial "estado derivado de props/estado anterior",
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes)
  // em vez de resetar via setState dentro de um useEffect.
  const [abertoAnterior, setAbertoAnterior] = useState(aberto);
  if (aberto !== abertoAnterior) {
    setAbertoAnterior(aberto);
    if (aberto) {
      if (editando && aula) {
        setValores({
          dia_semana: String(aula.dia_semana),
          hora_inicio: aula.hora_inicio,
          hora_fim: aula.hora_fim,
          // Pre-preencher a materia atual nao e' cosmetico: sem isso o PUT
          // apagaria a materia da aula em silencio (substituicao total).
          materia_id: aula.materia_id === null ? SEM_MATERIA : String(aula.materia_id),
        });
      } else {
        setValores(VALORES_INICIAIS);
      }
      setErroValidacao(null);
      setErroApi(null);
      setEnviando(false);
    }
  }

  const primeiroCampoRef = useRef<HTMLSelectElement>(null);
  const idTitulo = useId();
  const refModal = useFocoPreso(aberto);

  useEffect(() => {
    if (!aberto) return;
    primeiroCampoRef.current?.focus();
  }, [aberto]);

  useEffect(() => {
    if (!aberto) return;

    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") aoFechar();
    };

    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [aberto, aoFechar]);

  useEffect(() => {
    if (!aberto) return;

    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = anterior;
    };
  }, [aberto]);

  if (!aberto) return null;

  function atualizarCampo<K extends keyof typeof VALORES_INICIAIS>(
    campo: K,
    valor: (typeof VALORES_INICIAIS)[K],
  ) {
    setValores((atuais) => ({ ...atuais, [campo]: valor }));
  }

  async function aoSubmeter(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErroApi(null);

    const { dia_semana, hora_inicio, hora_fim, materia_id } = valores;
    if (!hora_inicio || !hora_fim) {
      setErroValidacao("Preencha o horário de início e de fim.");
      return;
    }
    if (hora_fim <= hora_inicio) {
      setErroValidacao("O horário de fim precisa ser depois do horário de início.");
      return;
    }
    setErroValidacao(null);

    const dados: NovaAula = {
      dia_semana: Number(dia_semana),
      hora_inicio,
      hora_fim,
      // Sempre explicito, inclusive null — ver o aviso no JSDoc do componente.
      materia_id: materia_id === SEM_MATERIA ? null : Number(materia_id),
    };

    setEnviando(true);
    try {
      await aoSalvar(dados);
      // Sucesso: quem chama (a vista) fecha e recarrega — nao mexe aqui.
    } catch (causa) {
      setErroApi(
        causa instanceof Error
          ? causa.message
          : `Não foi possível ${editando ? "salvar" : "criar"} a aula.`,
      );
    } finally {
      setEnviando(false);
    }
  }

  const erroExibido = erroValidacao ?? erroApi;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={aoFechar}
    >
      <div
        ref={refModal}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        onClick={(evento) => evento.stopPropagation()}
        className="flex w-full max-w-md flex-col gap-5 rounded-2xl p-6"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          boxShadow: "var(--shadow-raise)",
        }}
      >
        <div className="flex items-center justify-between gap-2">
          <h2
            id={idTitulo}
            className="text-text text-lg font-extrabold"
            style={{ fontFamily: "var(--font-geologica)" }}
          >
            {editando ? "Editar aula" : "Nova aula"}
          </h2>
          <button
            type="button"
            onClick={aoFechar}
            aria-label="Fechar"
            className="text-text-muted rounded-lg p-1"
            disabled={enviando}
          >
            <IconFechar size={20} />
          </button>
        </div>

        <form onSubmit={aoSubmeter} className="flex flex-col gap-4" noValidate>
          <Campo rotulo="Dia da semana">
            <select
              ref={primeiroCampoRef}
              value={valores.dia_semana}
              onChange={(evento) => atualizarCampo("dia_semana", evento.target.value)}
              className="text-text w-full rounded-lg bg-transparent px-3 py-2 text-sm outline-none"
              style={{ border: "1px solid var(--border)" }}
              disabled={enviando}
            >
              {DIAS_DA_SEMANA.map((nomeDia, indice) => (
                <option key={indice} value={indice}>
                  {nomeDia}
                </option>
              ))}
            </select>
          </Campo>

          <div className="grid grid-cols-2 gap-3">
            <Campo rotulo="Início">
              <input
                type="time"
                required
                value={valores.hora_inicio}
                onChange={(evento) => atualizarCampo("hora_inicio", evento.target.value)}
                className="text-text w-full rounded-lg bg-transparent px-3 py-2 text-sm outline-none"
                style={{ border: "1px solid var(--border)" }}
                disabled={enviando}
              />
            </Campo>
            <Campo rotulo="Fim">
              <input
                type="time"
                required
                value={valores.hora_fim}
                onChange={(evento) => atualizarCampo("hora_fim", evento.target.value)}
                className="text-text w-full rounded-lg bg-transparent px-3 py-2 text-sm outline-none"
                style={{ border: "1px solid var(--border)" }}
                disabled={enviando}
              />
            </Campo>
          </div>

          <Campo rotulo="Matéria (opcional)">
            <select
              value={valores.materia_id}
              onChange={(evento) => atualizarCampo("materia_id", evento.target.value)}
              className="text-text w-full rounded-lg bg-transparent px-3 py-2 text-sm outline-none"
              style={{ border: "1px solid var(--border)" }}
              disabled={enviando}
            >
              <option value={SEM_MATERIA}>Sem matéria</option>
              {materias.map((materia) => (
                <option key={materia.id} value={materia.id}>
                  {materia.nome}
                </option>
              ))}
            </select>
          </Campo>

          {erroExibido && (
            <p
              role="alert"
              className="rounded-xl px-4 py-3 text-sm font-semibold"
              style={{ background: "var(--danger-bg)", color: "var(--danger-fg)" }}
            >
              {erroExibido}
            </p>
          )}

          <div className="mt-1 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={aoFechar}
              disabled={enviando}
              className="text-text-body rounded-lg px-4 py-2.5 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-40"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={enviando}
              className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-extrabold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-60"
              style={{ background: "var(--primary)" }}
            >
              {enviando && (
                <span
                  aria-hidden
                  className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white"
                />
              )}
              {enviando
                ? editando
                  ? "Salvando..."
                  : "Criando..."
                : editando
                  ? "Salvar alterações"
                  : "Criar aula"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Campo({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-text-muted text-xs font-bold">{rotulo}</span>
      {children}
    </label>
  );
}
