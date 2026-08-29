"use client";

import { useEffect, useRef, useState } from "react";

import {
  CampoAnexo,
  LinhaDeAnexo,
  type EscolhaDeAnexo,
} from "@/components/ui/campo-anexo";
import { Modal } from "@/components/ui/modal";
import type { Aula, Materia } from "@/lib/types";

/** Espelha o max_length do model PlanoDaAula no backend. */
const MAXIMO_PLANO = 200;

/** Espelha TAMANHO_MAXIMO_ANEXO_AULA_BYTES em cupcam/web/api.py. */
const MAXIMO_ANEXO_BYTES = 10 * 1024 * 1024;

/** Segunda primeiro: a semana escolar comeca nela, e domingo quase nunca tem aula. */
const DIAS = [
  { valor: 1, nome: "Segunda-feira" },
  { valor: 2, nome: "Terça-feira" },
  { valor: 3, nome: "Quarta-feira" },
  { valor: 4, nome: "Quinta-feira" },
  { valor: 5, nome: "Sexta-feira" },
  { valor: 6, nome: "Sábado" },
  { valor: 0, nome: "Domingo" },
];

const ESTILO_CAMPO =
  "bg-surface-2 border-border-default text-text placeholder:text-text-muted w-full rounded-[9px] border px-[11px] py-[9px] text-[13px] outline-none focus:outline-2 focus:-outline-offset-1 focus:outline-[var(--primary-hover)] disabled:opacity-50";

const ROTULO = "text-text-muted text-[10px] font-bold tracking-[0.1em] uppercase";

function formatarTamanho(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type Props = {
  /** Aula sendo editada. `null` fecha o modal. */
  aula: Aula | null;
  /** Materias da escola, pro seletor. */
  materias?: Materia[];
  aoFechar: () => void;
  /** Chamado depois de salvar, pra tela recarregar os dados do servidor. */
  aoSalvar: () => void;
};

/**
 * Edicao de uma aula da grade: o que ela E' (materia, dia, horario), o plano e
 * o material.
 *
 * MODAL CENTRADO, NAO GAVETA (29/08/2026): era um painel de 380px encostado na
 * direita, desenhado quando so' havia dois campos. Com materia e horario
 * editaveis a gaveta ficou apertada, e o pedido foi explicito — abrir no meio,
 * grande, com mais coisa editavel.
 *
 * O plano e o material pertencem a' AULA DA GRADE, nao a' sessao gravada: sao
 * preparacao, existem antes de a camera ligar e valem em toda repeticao semanal
 * daquela aula (ver o docstring de gestao/planos.py no backend).
 */
export function EditorAula({ aula, materias = [], aoFechar, aoSalvar }: Props) {
  const [plano, setPlano] = useState("");
  const [materiaId, setMateriaId] = useState<number | null>(null);
  const [diaSemana, setDiaSemana] = useState(1);
  const [horaInicio, setHoraInicio] = useState("");
  const [horaFim, setHoraFim] = useState("");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [link, setLink] = useState<{ url: string; nome: string } | null>(null);
  const [removerAnexo, setRemoverAnexo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const aberto = aula !== null;
  const refPlano = useRef<HTMLTextAreaElement>(null);

  // Reset na transicao fechado->aberto, durante a renderizacao — o padrao
  // oficial do React pra estado derivado de props, em vez de setState num
  // useEffect. Mesmo molde do ModalMateria.
  const [aulaAnterior, setAulaAnterior] = useState(aula?.id ?? null);
  if ((aula?.id ?? null) !== aulaAnterior) {
    setAulaAnterior(aula?.id ?? null);
    setPlano(aula?.plano ?? "");
    setMateriaId(aula?.materia_id ?? null);
    setDiaSemana(aula?.dia_semana ?? 1);
    setHoraInicio(aula?.hora_inicio ?? "");
    setHoraFim(aula?.hora_fim ?? "");
    setArquivo(null);
    setLink(null);
    setRemoverAnexo(false);
    setErro(null);
    setEnviando(false);
  }

  useEffect(() => {
    if (!aberto) return;
    refPlano.current?.focus();
  }, [aberto]);

  // Ctrl+V com o modal aberto anexa o arquivo do clipboard — o caminho mais
  // rapido pra quem acabou de printar um slide.
  useEffect(() => {
    if (!aberto) return;
    const aoColar = (evento: ClipboardEvent) => {
      const colado = evento.clipboardData?.files?.[0];
      if (colado) {
        evento.preventDefault();
        escolherAnexo({ tipo: "arquivo", arquivo: colado });
      }
    };
    document.addEventListener("paste", aoColar);
    return () => document.removeEventListener("paste", aoColar);
  }, [aberto]);

  if (!aula) return null;

  function escolherAnexo(escolha: EscolhaDeAnexo) {
    setErro(null);
    setRemoverAnexo(false);
    if (escolha.tipo === "arquivo") {
      if (escolha.arquivo.size === 0) {
        setErro("O arquivo está vazio.");
        return;
      }
      setArquivo(escolha.arquivo);
      setLink(null);
    } else {
      setLink({ url: escolha.url, nome: escolha.nome });
      setArquivo(null);
    }
  }

  // O material mostrado: o recem-escolhido tem prioridade sobre o ja' gravado.
  const materialAtual = arquivo
    ? {
        nome: arquivo.name,
        detalhe: `${formatarTamanho(arquivo.size)} · será enviado ao salvar`,
        ehLink: false,
        href: undefined,
      }
    : link
      ? {
          nome: link.nome || link.url,
          detalhe: "link · será salvo ao confirmar",
          ehLink: true,
          href: link.url,
        }
      : !removerAnexo && aula.anexo_nome
        ? {
            nome: aula.anexo_nome,
            detalhe: aula.anexo_eh_link
              ? (aula.anexo_url ?? "link")
              : formatarTamanho(aula.anexo_tamanho ?? 0),
            ehLink: aula.anexo_eh_link,
            // Link abre o endereco; arquivo baixa pela rota. Baixar um link
            // devolveria 409 — ver baixar_anexo_da_aula no backend.
            href: aula.anexo_eh_link
              ? (aula.anexo_url ?? undefined)
              : `/api/admin/aulas/${aula.id}/anexo`,
          }
        : null;

  async function salvar() {
    if (!aula) return;
    setErro(null);

    if (!horaInicio || !horaFim) {
      setErro("Preencha o horário de início e de fim.");
      return;
    }

    setEnviando(true);
    try {
      const mudouIdentidade =
        materiaId !== aula.materia_id ||
        diaSemana !== aula.dia_semana ||
        horaInicio !== aula.hora_inicio ||
        horaFim !== aula.hora_fim;

      if (mudouIdentidade) {
        // PUT aqui e' SUBSTITUICAO TOTAL, nao merge parcial: `materia_id`
        // omitido LIMPA a materia da aula (contrato de 25/07/2026, coberto por
        // teste no backend). Por isso os quatro campos vao SEMPRE juntos,
        // mesmo quando so' um deles mudou.
        const resposta = await fetch(`/api/admin/aulas/${aula.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            dia_semana: diaSemana,
            hora_inicio: horaInicio,
            hora_fim: horaFim,
            materia_id: materiaId,
          }),
        });
        if (!resposta.ok) {
          const corpo = await resposta.json().catch(() => null);
          // 409 e' choque de horario, e o backend manda o nome da aula
          // concorrente — dizer QUAL evita o professor tentar horarios no escuro.
          if (resposta.status === 409) {
            const nome = corpo?.detalhe?.nome ?? corpo?.erro?.nome;
            throw new Error(
              typeof nome === "string"
                ? `Esse horário já é da aula de ${nome}.`
                : "Esse horário choca com outra aula.",
            );
          }
          throw new Error(
            typeof corpo?.erro === "string"
              ? corpo.erro
              : "Não foi possível salvar o horário.",
          );
        }
      }

      // O plano vai sempre que muda: texto vazio LIMPA o plano, que e' como a
      // tela apaga.
      if (plano !== aula.plano) {
        const resposta = await fetch(`/api/admin/aulas/${aula.id}/plano`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ texto: plano }),
        });
        if (!resposta.ok) throw new Error("Não foi possível salvar o plano.");
      }

      if (arquivo) {
        const form = new FormData();
        form.append("arquivo", arquivo);
        const resposta = await fetch(`/api/admin/aulas/${aula.id}/anexo`, {
          method: "PUT",
          body: form,
        });
        if (!resposta.ok) throw new Error("Não foi possível enviar o arquivo.");
      } else if (link) {
        const resposta = await fetch(`/api/admin/aulas/${aula.id}/link`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(link),
        });
        if (!resposta.ok) {
          const corpo = await resposta.json().catch(() => null);
          throw new Error(
            typeof corpo?.erro === "string"
              ? corpo.erro
              : "Não foi possível salvar o link.",
          );
        }
      } else if (removerAnexo && aula.tem_anexo) {
        const resposta = await fetch(`/api/admin/aulas/${aula.id}/anexo`, {
          method: "DELETE",
        });
        if (!resposta.ok) throw new Error("Não foi possível remover o material.");
      }

      aoSalvar();
    } catch (causa) {
      setErro(causa instanceof Error ? causa.message : "Não foi possível salvar.");
      setEnviando(false);
    }
  }

  return (
    <Modal
      aberto={aberto}
      titulo="Editar aula"
      subtitulo={aula.turma_nome}
      largura="grande"
      ocupado={enviando}
      aoFechar={aoFechar}
      rodape={
        <>
          <button
            type="button"
            onClick={aoFechar}
            disabled={enviando}
            className="bg-surface-2 border-border-default text-text-body rounded-[9px] border px-4 py-2.5 text-[13px] font-semibold disabled:opacity-40"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void salvar()}
            disabled={enviando}
            className="flex items-center justify-center gap-2 rounded-[9px] px-5 py-2.5 text-[13px] font-semibold transition-opacity disabled:opacity-60"
            style={{ background: "var(--primary)", color: "var(--text-on-brand)" }}
          >
            {enviando && (
              <span
                aria-hidden
                className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current/40 border-t-current"
              />
            )}
            {enviando ? "Salvando..." : "Salvar"}
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-5 pb-2">
        {/* O QUE A AULA E'. Vem primeiro porque e' o que o professor reconhece
            no bloco que ele acabou de clicar. */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="campo-materia" className={ROTULO}>
              Matéria
            </label>
            <select
              id="campo-materia"
              value={materiaId ?? ""}
              onChange={(evento) =>
                setMateriaId(
                  evento.target.value ? Number(evento.target.value) : null,
                )
              }
              disabled={enviando}
              className={`${ESTILO_CAMPO} cursor-pointer`}
            >
              <option value="">Sem matéria</option>
              {materias.map((materia) => (
                <option key={materia.id} value={materia.id}>
                  {materia.nome}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="campo-dia" className={ROTULO}>
                Dia
              </label>
              <select
                id="campo-dia"
                value={diaSemana}
                onChange={(evento) => setDiaSemana(Number(evento.target.value))}
                disabled={enviando}
                className={`${ESTILO_CAMPO} cursor-pointer`}
              >
                {DIAS.map((dia) => (
                  <option key={dia.valor} value={dia.valor}>
                    {dia.nome}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="campo-inicio" className={ROTULO}>
                Início
              </label>
              <input
                id="campo-inicio"
                type="time"
                value={horaInicio}
                onChange={(evento) => setHoraInicio(evento.target.value)}
                disabled={enviando}
                className={ESTILO_CAMPO}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="campo-fim" className={ROTULO}>
                Fim
              </label>
              <input
                id="campo-fim"
                type="time"
                value={horaFim}
                onChange={(evento) => setHoraFim(evento.target.value)}
                disabled={enviando}
                className={ESTILO_CAMPO}
              />
            </div>
          </div>
        </div>

        {/* O QUE VAI ACONTECER NELA. */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="campo-plano" className={ROTULO}>
            Plano da aula
          </label>
          <textarea
            id="campo-plano"
            ref={refPlano}
            value={plano}
            onChange={(evento) => setPlano(evento.target.value)}
            maxLength={MAXIMO_PLANO}
            disabled={enviando}
            placeholder="Em uma frase: o que você vai dar nesta aula"
            className={`${ESTILO_CAMPO} min-h-[66px] resize-y`}
          />
          {/* O limite e' visivel ENQUANTO se escreve, nao um erro depois de
              enviar. Fica ambar perto do fim pra avisar antes de cortar. */}
          <span
            className="self-end text-[10px] tabular-nums"
            style={{
              color:
                plano.length > MAXIMO_PLANO - 20
                  ? "var(--warn-fg)"
                  : "var(--text-muted)",
              fontWeight: plano.length > MAXIMO_PLANO - 20 ? 600 : 400,
            }}
          >
            {plano.length}/{MAXIMO_PLANO}
          </span>
        </div>

        <div className="flex flex-col gap-2">
          <span className={ROTULO}>Material</span>
          <span className="text-text-muted text-[11.5px]">
            Um arquivo ou um link por aula — o novo substitui o atual.
          </span>

          {materialAtual ? (
            <LinhaDeAnexo
              nome={materialAtual.nome}
              detalhe={materialAtual.detalhe}
              ehLink={materialAtual.ehLink}
              href={materialAtual.href}
              desabilitado={enviando}
              aoRemover={() => {
                if (arquivo) setArquivo(null);
                else if (link) setLink(null);
                else setRemoverAnexo(true);
              }}
            />
          ) : (
            <CampoAnexo
              maximoBytes={MAXIMO_ANEXO_BYTES}
              desabilitado={enviando}
              aoEscolher={escolherAnexo}
            />
          )}

          {removerAnexo && aula.tem_anexo && (
            <p className="text-text-muted text-[12.5px]">
              O material será removido ao salvar.{" "}
              <button
                type="button"
                onClick={() => setRemoverAnexo(false)}
                className="font-semibold underline"
                style={{ color: "var(--primary)" }}
              >
                Desfazer
              </button>
            </p>
          )}
        </div>

        {erro && (
          <p
            role="alert"
            className="rounded-xl px-4 py-3 text-[13px] font-semibold"
            style={{ background: "var(--danger-bg)", color: "var(--danger-fg)" }}
          >
            {erro}
          </p>
        )}
      </div>
    </Modal>
  );
}
