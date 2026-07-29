"use client";

import { useEffect, useId, useRef, useState } from "react";

import { useFocoPreso } from "@/components/coordenacao/usar-foco-preso";
import { CampoComExemplo } from "@/components/ui/campo-com-exemplo";
import { EtiquetaMateria } from "@/components/ui/etiqueta-materia";
import { BotaoIcone } from "@/components/ui/botao-icone";
import { IconCheckSimples, IconFechar } from "@/components/ui/icons";
import { CORES_MATERIA } from "@/lib/format";
import type { CorMateria, Materia, NovaMateria } from "@/lib/types";

type ModoModal = "criar" | "editar";

type ModalMateriaProps = {
  aberto: boolean;
  modo: ModoModal;
  /** Materia sendo editada (obrigatorio no modo "editar"; ignorado no "criar"). */
  materia?: Materia | null;
  aoFechar: () => void;
  /** Rejeita com Error(mensagem) — o modal mostra o texto e permanece aberto. */
  aoSalvar: (dados: NovaMateria) => Promise<void>;
};

const VALORES_INICIAIS: { nome: string; cor: CorMateria | null } = {
  nome: "",
  cor: null,
};

/**
 * Modal de materia unificado — cria uma materia nova ou edita uma existente,
 * decidido pelo prop `modo`. Mesmo molde do `ModalTurma`: overlay escurecido +
 * card centrado, Esc fecha, clique fora fecha, foco inicial no campo, reset ao
 * abrir.
 *
 * Materia e' global (nao pertence a turma nenhuma) e tem nome + cor opcional.
 * A cor vira o grifo do nome na grade da turma; "Sem cor" e' uma escolha
 * valida, nao um estado inacabado.
 *
 * A unicidade do nome e a validade da cor quem valida e' o backend — vira um
 * 422 que a vista repassa como Error e cai no erro inline aqui.
 *
 * ATENCAO no modo editar: o PUT do backend e' substituicao TOTAL — mandar
 * `cor: null` LIMPA a cor da materia. Por isso o seletor ja abre com a cor
 * atual marcada e o envio manda sempre a cor explicita.
 */
export function ModalMateria({
  aberto,
  modo,
  materia,
  aoFechar,
  aoSalvar,
}: ModalMateriaProps) {
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
      setValores(
        // Pre-preencher a cor atual nao e' cosmetico: sem isso o PUT apagaria
        // a cor da materia em silencio (substituicao total).
        editando && materia
          ? { nome: materia.nome, cor: materia.cor }
          : VALORES_INICIAIS,
      );
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

  async function aoSubmeter(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErroApi(null);

    const nome = valores.nome.trim();
    if (!nome) {
      setErroValidacao("Informe o nome da matéria.");
      return;
    }
    setErroValidacao(null);

    setEnviando(true);
    try {
      // `cor` sempre explicita, inclusive null — ver o aviso no JSDoc.
      await aoSalvar({ nome, cor: valores.cor });
      // Sucesso: quem chama (a vista) fecha e recarrega — nao mexe aqui.
    } catch (causa) {
      setErroApi(
        causa instanceof Error
          ? causa.message
          : `Não foi possível ${editando ? "salvar" : "criar"} a matéria.`,
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
            {editando ? "Renomear matéria" : "Nova matéria"}
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
            rotulo="Nome da matéria"
            valor={valores.nome}
            aoMudar={(nome) => setValores((atuais) => ({ ...atuais, nome }))}
            exemplo="História"
            disabled={enviando}
          />

          {/* Seletor de cor. Grupo de radio, nao <select>: as opcoes SAO as
              cores, entao mostra-las e' mais claro que nomea-las numa lista.
              O nome de cada cor fica no aria-label pra quem usa leitor de tela
              e pra quem nao distingue as cores. */}
          <fieldset className="flex flex-col gap-2" disabled={enviando}>
            <legend className="text-text-muted text-xs font-bold">
              Cor (opcional)
            </legend>
            <div className="flex flex-wrap items-center gap-2">
              <BotaoCor
                rotulo="Sem cor"
                selecionada={valores.cor === null}
                aoEscolher={() => setValores((atuais) => ({ ...atuais, cor: null }))}
              />
              {CORES_MATERIA.map((opcao) => (
                <BotaoCor
                  key={opcao.id}
                  rotulo={opcao.rotulo}
                  fundo={opcao.fundo}
                  texto={opcao.texto}
                  selecionada={valores.cor === opcao.id}
                  aoEscolher={() =>
                    setValores((atuais) => ({ ...atuais, cor: opcao.id }))
                  }
                />
              ))}
            </div>

            {/* Previa: a cor so' faz sentido vista no lugar onde vai aparecer,
                grifando o nome da materia. */}
            <p className="mt-1 flex items-center gap-2 text-xs">
              <span className="text-text-muted">Na grade:</span>
              <EtiquetaMateria
                nome={valores.nome.trim() || "História"}
                cor={valores.cor}
              />
            </p>
          </fieldset>

          {/* Editar vale pra grade inteira: a materia e' global, nao uma
              copia por aula. Sem esse aviso o usuario pode achar que so' a
              turma aberta seria afetada. */}
          {editando && (
            <p className="text-text-muted text-xs leading-relaxed">
              A matéria é usada por todas as turmas — o nome e a cor aparecem em
              todas as aulas que a utilizam.
            </p>
          )}

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
                  : "Criar matéria"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

type BotaoCorProps = {
  rotulo: string;
  /** Cor de fundo do botao. Ausente = a opcao "Sem cor". */
  fundo?: string;
  texto?: string;
  selecionada: boolean;
  aoEscolher: () => void;
};

/**
 * Uma bolinha do seletor de cor.
 *
 * `aria-pressed` em vez de `<input type="radio">`: sao botoes de acao imediata
 * num grupo pequeno, e o par role/estado ja anuncia certo pro leitor de tela.
 * O nome da cor vai no `aria-label` porque a bolinha nao tem texto visivel —
 * sem ele, quem usa leitor de tela ouviria so' "botao".
 *
 * A selecao e' marcada por um check DENTRO da bolinha, alem do anel em volta:
 * anel colorido sozinho seria informacao transmitida so' por cor.
 *
 * A bolinha mede 36px (nao 28) porque sao 10 numa fileira: a area de toque
 * invisivel do BotaoIcone se sobreporia em cadeia entre vizinhas, entao aqui o
 * alvo cresce de verdade — numa paleta, bolinha maior tambem se ve melhor. Nao
 * usa BotaoIcone porque o anel de selecao (outline com offset) e' especifico
 * deste seletor.
 */
function BotaoCor({ rotulo, fundo, texto, selecionada, aoEscolher }: BotaoCorProps) {
  return (
    <button
      type="button"
      onClick={aoEscolher}
      aria-label={rotulo}
      aria-pressed={selecionada}
      title={rotulo}
      className="inline-flex h-9 w-9 items-center justify-center rounded-full transition-transform"
      style={{
        background: fundo ?? "var(--surface-2)",
        color: texto ?? "var(--text-muted)",
        border: fundo ? "1.5px solid transparent" : "1.5px dashed var(--border-strong)",
        outline: selecionada ? "2px solid var(--primary)" : "none",
        outlineOffset: "2px",
      }}
    >
      {selecionada && <IconCheckSimples size={12} />}
    </button>
  );
}
