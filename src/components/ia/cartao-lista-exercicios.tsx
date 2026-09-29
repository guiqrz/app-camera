"use client";

import { useCallback, useEffect, useState } from "react";

import { IconBaixar, IconFechar } from "@/components/ui/icons";
import {
  rotuloDaContagem,
  semQuestao,
  urlDoArquivo,
  type FormatoDaLista,
  type ParteDaLista,
} from "@/lib/lista-exercicios";
import type { ListaExercicios } from "@/lib/types";

/**
 * Os 4 arquivos, na ordem em que aparecem. O que o professor mais baixa (a
 * lista em PDF, pra imprimir) vem primeiro.
 */
const DOWNLOADS: { formato: FormatoDaLista; parte: ParteDaLista; rotulo: string }[] = [
  { formato: "pdf", parte: "lista", rotulo: "Lista (PDF)" },
  { formato: "pdf", parte: "gabarito", rotulo: "Gabarito (PDF)" },
  { formato: "docx", parte: "lista", rotulo: "Lista (Word)" },
  { formato: "docx", parte: "gabarito", rotulo: "Gabarito (Word)" },
];

type Estado =
  | { tipo: "carregando" }
  | { tipo: "erro"; mensagem: string }
  | { tipo: "pronto"; lista: ListaExercicios };

type CartaoListaExerciciosProps = { listaId: number };

/**
 * A lista de exercicios que o Cup AI montou, embaixo da resposta dele.
 *
 * O professor ve O QUE vai pro aluno antes de baixar: fonte de cada questao
 * (questao REAL de vestibular, nunca escrita pela IA), materia, assuntos e o
 * comeco do enunciado. O ✕ tira a questao na hora (atualizacao otimista) e
 * grava no backend; trocar por outra e' pedido ao Cup AI, nao por aqui.
 *
 * O cartao busca a lista ATUAL ao montar, em vez de receber os dados da
 * mensagem: reabrir a conversa dias depois mostra a lista como ficou depois
 * dos ✕, e os downloads saem desse mesmo estado (o arquivo e' montado pelo
 * backend a partir do banco, nunca do texto da conversa).
 */
export function CartaoListaExercicios({ listaId }: CartaoListaExerciciosProps) {
  const [estado, setEstado] = useState<Estado>({ tipo: "carregando" });
  const [aviso, setAviso] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    fetch(`/api/ia/listas/${listaId}`)
      .then(async (resposta) => {
        const corpo = (await resposta.json().catch(() => null)) as
          | ListaExercicios
          | { erro?: string }
          | null;
        if (cancelado) return;
        if (!resposta.ok || corpo === null || !("questoes" in corpo)) {
          const mensagem =
            corpo && "erro" in corpo && corpo.erro
              ? corpo.erro
              : "Não foi possível carregar a lista.";
          setEstado({ tipo: "erro", mensagem });
          return;
        }
        setEstado({ tipo: "pronto", lista: corpo });
      })
      .catch(() => {
        if (!cancelado) {
          setEstado({ tipo: "erro", mensagem: "Não foi possível carregar a lista." });
        }
      });
    return () => {
      cancelado = true;
    };
  }, [listaId]);

  const remover = useCallback(
    async (questaoId: number) => {
      if (estado.tipo !== "pronto") return;
      const anterior = estado.lista;
      const ids = semQuestao(
        anterior.questoes.map((q) => q.id),
        questaoId,
      );

      // Otimista: a questao some na hora. A numeracao se refaz (1..N) porque e'
      // a que o aluno vai ver no arquivo.
      setAviso(null);
      setEstado({
        tipo: "pronto",
        lista: {
          ...anterior,
          questoes: anterior.questoes
            .filter((q) => q.id !== questaoId)
            .map((q, indice) => ({ ...q, numero: indice + 1 })),
        },
      });

      try {
        const resposta = await fetch(`/api/ia/listas/${listaId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ questaoIds: ids }),
        });
        const corpo = (await resposta.json().catch(() => null)) as
          | ListaExercicios
          | { erro?: string }
          | null;
        if (!resposta.ok || corpo === null || !("questoes" in corpo)) {
          throw new Error(
            corpo && "erro" in corpo && corpo.erro
              ? corpo.erro
              : "Não foi possível remover a questão. Tente de novo.",
          );
        }
        // O backend e' a fonte da verdade da ordem e dos numeros.
        setEstado({ tipo: "pronto", lista: corpo });
      } catch (erro) {
        // Desfaz: a questao volta pro lugar, e o aviso diz o porque.
        setEstado({ tipo: "pronto", lista: anterior });
        setAviso(
          erro instanceof Error ? erro.message : "Não foi possível remover a questão. Tente de novo.",
        );
      }
    },
    [estado, listaId],
  );

  if (estado.tipo === "carregando") {
    return (
      <div
        className="border-border-default bg-surface mt-3 rounded-xl border p-4"
        aria-busy="true"
      >
        <p className="text-text-muted text-xs">Carregando a lista de exercícios…</p>
      </div>
    );
  }

  if (estado.tipo === "erro") {
    return (
      <div className="border-border-default bg-surface mt-3 rounded-xl border p-4" role="alert">
        <p className="text-xs font-semibold" style={{ color: "var(--warn-fg)" }}>
          {estado.mensagem}
        </p>
      </div>
    );
  }

  const { lista } = estado;
  const vazia = lista.questoes.length === 0;

  return (
    <section
      className="border-border-default bg-surface mt-3 rounded-xl border p-4"
      aria-label={`Lista de exercícios: ${lista.titulo}`}
    >
      <header className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h3 className="text-text text-sm font-semibold">{lista.titulo}</h3>
        <span className="text-text-muted text-xs">{rotuloDaContagem(lista.questoes.length)}</span>
      </header>

      {vazia ? (
        <p className="text-text-muted text-xs">
          Nenhuma questão na lista. Peça ao Cup AI novas questões.
        </p>
      ) : (
        <>
          <ol className="flex flex-col gap-2">
            {lista.questoes.map((questao) => (
              <li
                key={questao.id}
                className="border-border-default flex items-start gap-3 rounded-lg border p-3"
                style={{ background: "var(--surface-2)" }}
              >
                <span className="text-text-muted w-5 flex-none pt-px text-xs font-semibold tabular-nums">
                  {questao.numero}.
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-text text-xs font-semibold">{questao.fonte}</p>
                  {(questao.materia || questao.assuntos.length > 0) && (
                    <p className="text-text-muted mt-0.5 text-[11px]">
                      {[questao.materia, questao.assuntos.join(", ")].filter(Boolean).join(" · ")}
                    </p>
                  )}
                  <p className="text-text-body mt-1 text-xs leading-relaxed">{questao.trecho}</p>
                </div>
                <button
                  type="button"
                  onClick={() => void remover(questao.id)}
                  aria-label={`Remover questão ${questao.numero}`}
                  className="text-text-muted hover:text-text grid h-7 w-7 flex-none place-items-center rounded-md transition-colors hover:bg-[var(--surface)] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--primary)]"
                >
                  <IconFechar size={14} />
                </button>
              </li>
            ))}
          </ol>

          {/* 2x2 no celular, em linha a partir de 480px: quatro botoes numa
              linha so' quebrariam no meio do rotulo abaixo disso. */}
          <div className="mt-3 grid grid-cols-2 gap-2 min-[480px]:flex min-[480px]:flex-wrap">
            {DOWNLOADS.map(({ formato, parte, rotulo }) => (
              <a
                key={`${formato}-${parte}`}
                href={urlDoArquivo(lista.id, formato, parte)}
                download
                className="btn-acao justify-center"
              >
                <span aria-hidden>
                  <IconBaixar size={13} />
                </span>
                {rotulo}
              </a>
            ))}
          </div>
        </>
      )}

      {aviso !== null && (
        <p
          className="mt-2 text-[11px] font-semibold"
          style={{ color: "var(--warn-fg)" }}
          role="alert"
        >
          {aviso}
        </p>
      )}
    </section>
  );
}
