"use client";

import { useEffect, useId, useRef, useState } from "react";

import { useFocoPreso } from "@/components/coordenacao/usar-foco-preso";
import { CampoComExemplo } from "@/components/ui/campo-com-exemplo";
import { BotaoIcone } from "@/components/ui/botao-icone";
import { IconFechar } from "@/components/ui/icons";
import type { NovaTurma } from "@/lib/types";

type ModalTurmaProps = {
  aberto: boolean;
  aoFechar: () => void;
  /** Rejeita com Error(mensagem) — o modal mostra o texto e permanece aberto. */
  aoSalvar: (dados: NovaTurma) => Promise<void>;
};

const VALORES_INICIAIS = {
  nome: "",
  sala_id: "",
};

/**
 * Modal de turma NOVA. Overlay escurecido + card centrado, Esc fecha, clique
 * fora fecha, foco inicial no primeiro campo, reset ao abrir.
 *
 * So' cria: editar turma virou a pagina `/coordenacao/turmas/{id}`, onde os
 * dados aparecem junto da grade semanal de aulas. Criar continua em modal
 * porque sao dois campos e o coordenador volta pra lista logo em seguida —
 * mandar ele pra outra pagina pra digitar um nome seria caminho longo demais.
 *
 * Turma e' so' identidade: nome + sala. A agenda (dia e horario) e' a entidade
 * Aula, cadastrada na grade da pagina da turma — inclusive o conflito de
 * horario, que e' entre aulas, nunca entre turmas.
 */
export function ModalTurma({ aberto, aoFechar, aoSalvar }: ModalTurmaProps) {
  const [valores, setValores] = useState(VALORES_INICIAIS);
  const [erroValidacao, setErroValidacao] = useState<string | null>(null);
  const [erroApi, setErroApi] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  // Espelha `aberto` so' pra detectar a transicao fechado->aberto durante a
  // renderizacao (padrao oficial "estado derivado de props/estado anterior",
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes)
  // em vez de resetar via setState dentro de um useEffect.
  const [abertoAnterior, setAbertoAnterior] = useState(aberto);
  if (aberto !== abertoAnterior) {
    setAbertoAnterior(aberto);
    if (aberto) {
      setValores(VALORES_INICIAIS);
      setErroValidacao(null);
      setErroApi(null);
      setEnviando(false);
    }
  }

  const primeiroCampoRef = useRef<HTMLInputElement>(null);
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

    const { nome, sala_id } = valores;
    if (!nome.trim() || !sala_id.trim()) {
      setErroValidacao("Preencha todos os campos.");
      return;
    }
    setErroValidacao(null);

    const dados: NovaTurma = { nome: nome.trim(), sala_id: sala_id.trim() };

    setEnviando(true);
    try {
      await aoSalvar(dados);
      // Sucesso: quem chama (a vista) fecha e recarrega — nao mexe aqui.
    } catch (causa) {
      setErroApi(
        causa instanceof Error ? causa.message : "Não foi possível criar a turma.",
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
            className="text-text text-lg font-semibold"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Nova turma
          </h2>
          <BotaoIcone
            rotulo="Fechar"
            aoClicar={aoFechar}
            desabilitado={enviando}
            cor="var(--text-muted)"
          >
            <IconFechar size={20} />
          </BotaoIcone>
        </div>

        <form onSubmit={aoSubmeter} className="flex flex-col gap-4" noValidate>
          <CampoComExemplo
            ref={primeiroCampoRef}
            rotulo="Nome da turma"
            valor={valores.nome}
            aoMudar={(valor) => atualizarCampo("nome", valor)}
            exemplo="Turma 8A"
            disabled={enviando}
          />

          <CampoComExemplo
            rotulo="Sala"
            valor={valores.sala_id}
            aoMudar={(valor) => atualizarCampo("sala_id", valor)}
            exemplo="sala_32A"
            disabled={enviando}
          />

          {/* Os horarios sao cadastrados como aulas, na grade semanal da
              pagina da turma — uma turma tem varios encontros na semana. */}
          <p className="text-text-muted text-xs leading-relaxed">
            Depois de criar, abra a turma para montar a <strong>grade semanal</strong> com
            os dias e horários das aulas.
          </p>

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
              className="text-text-body rounded-lg px-4 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={enviando}
              className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-60"
              style={{ background: "var(--primary)" }}
            >
              {enviando && (
                <span
                  aria-hidden
                  className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white"
                />
              )}
              {enviando ? "Criando..." : "Criar turma"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
