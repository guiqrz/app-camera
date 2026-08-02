"use client";

import { useEffect, useState } from "react";

import { IconCalendario, IconFechar, IconTurma } from "@/components/ui/icons";
import { formatarDataCurta, formatarIntervalo } from "@/lib/format";
import type { Anexo, AulaCard, AulasDaTurma, Transcricao, Turma } from "@/lib/types";

/** Anexo de aula. O seletor so' produz este ramo da uniao — nunca arquivo. */
type AnexoDeAula = Extract<Anexo, { tipo: "aula" }>;

type SeletorAulaProps = {
  aoEscolher: (anexo: AnexoDeAula) => void;
  aoFechar: () => void;
};

/** Rotulo curto da aula pro chip: "Aula 28/07 · Biologia". */
function rotularAula(aula: AulaCard): string {
  const data = formatarDataCurta(aula.data);
  return aula.materia ? `Aula ${data} · ${aula.materia}` : `Aula ${data}`;
}

/**
 * Escolha da aula a anexar: turma, depois a aula dada.
 *
 * A lista traz SESSOES (aulas que aconteceram), nao a grade horaria — so' aula
 * que rodou pode ter transcricao. Aula em andamento fica de fora: a transcricao
 * so' existe depois que a captura encerra.
 *
 * A checagem de transcricao acontece na ESCOLHA, nao ao montar a lista: saber
 * de antemao exigiria uma requisicao por aula, e uma turma com dezenas de aulas
 * dispararia dezenas de idas a' API da escola toda vez que o seletor abrisse.
 * O custo e' o professor descobrir depois de clicar — por isso o motivo aparece
 * ali mesmo, e a aula nao e' anexada vazia.
 */
export function SeletorAula({ aoEscolher, aoFechar }: SeletorAulaProps) {
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [turmaId, setTurmaId] = useState<number | null>(null);
  const [aulas, setAulas] = useState<AulaCard[]>([]);
  // Dois carregamentos SEPARADOS, um por requisicao. Com um so', o intervalo
  // entre a chegada das turmas e a partida das aulas ficava com "carregando"
  // falso e a lista vazia — a tela piscava "esta turma nao tem aulas
  // encerradas" antes de sequer perguntar por elas.
  const [carregandoTurmas, setCarregandoTurmas] = useState(true);
  const [carregandoAulas, setCarregandoAulas] = useState(false);
  const [verificandoId, setVerificandoId] = useState<number | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  // De qual turma a lista `aulas` fala. Distingue "ainda nao busquei as aulas
  // desta turma" de "busquei e ela nao tem nenhuma" — as duas deixam `aulas`
  // vazio, mas so' a segunda deve mostrar o estado vazio na tela.
  const [turmaDasAulas, setTurmaDasAulas] = useState<number | null>(null);
  const carregando =
    carregandoTurmas || carregandoAulas || (turmaId !== null && turmaDasAulas !== turmaId);

  // Turmas, uma vez. A primeira ja' vem escolhida pra tela abrir com conteudo
  // em vez de um dropdown vazio esperando um clique.
  useEffect(() => {
    let cancelado = false;
    (async () => {
      try {
        const r = await fetch("/api/ia/aulas", { cache: "no-store" });
        if (!r.ok) throw new Error("falha");
        const lista = (await r.json()) as Turma[];
        if (cancelado) return;
        setTurmas(lista);
        setTurmaId(lista[0]?.id ?? null);
      } catch {
        if (!cancelado) setErro("Não foi possível carregar as turmas.");
      } finally {
        // Sempre encerra, inclusive na falha: sem isto a tela girava pra sempre
        // quando a API nao respondia, em vez de mostrar o erro acima.
        if (!cancelado) setCarregandoTurmas(false);
      }
    })();
    return () => {
      cancelado = true;
    };
  }, []);

  // Aulas da turma escolhida.
  useEffect(() => {
    if (turmaId === null) return;
    let cancelado = false;
    (async () => {
      // Dentro do async, e nao no corpo do efeito: setState sincrono ali
      // dispara renderizacao em cascata (react-hooks/set-state-in-effect).
      setCarregandoAulas(true);
      setErro(null);
      try {
        const r = await fetch(`/api/ia/aulas?turma=${turmaId}`, { cache: "no-store" });
        if (!r.ok) throw new Error("falha");
        const dados = (await r.json()) as AulasDaTurma;
        if (cancelado) return;
        // Aula em andamento nao entra: a transcricao so' sai depois do fim.
        setAulas(dados.aulas.filter((aula) => !aula.em_andamento));
        // Marca de qual turma esta lista fala — inclusive quando ela veio
        // vazia, que e' o caso que o estado vazio da tela precisa distinguir.
        setTurmaDasAulas(turmaId);
      } catch {
        if (!cancelado) {
          setErro("Não foi possível carregar as aulas desta turma.");
          // Sem isto a tela ficaria em "Carregando aulas…" apos a falha, ja'
          // que `turmaDasAulas` nunca alcancaria `turmaId`.
          setTurmaDasAulas(turmaId);
          setAulas([]);
        }
      } finally {
        if (!cancelado) setCarregandoAulas(false);
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [turmaId]);

  const escolher = async (aula: AulaCard) => {
    setVerificandoId(aula.sessao_id);
    setErro(null);
    try {
      const r = await fetch(`/api/transcricao/${aula.sessao_id}`, {
        cache: "no-store",
      });

      // 404 e' o caso comum: a aula nao gravou audio. Nao e' erro de sistema.
      if (r.status === 404) {
        setErro(
          `${rotularAula(aula)} não tem transcrição disponível — não dá pra anexar.`,
        );
        return;
      }
      if (!r.ok) {
        setErro("Não foi possível verificar a transcrição desta aula.");
        return;
      }

      const transcricao = (await r.json()) as Transcricao;
      // Anexar uma transcricao que ainda esta rodando (ou que falhou) mandaria
      // texto vazio ou pela metade pro modelo, que responderia com confianca
      // sobre uma aula que nao leu.
      if (transcricao.estado !== "pronta") {
        setErro(
          transcricao.estado === "transcrevendo"
            ? `${rotularAula(aula)} ainda está sendo transcrita. Tente daqui a alguns minutos.`
            : `A transcrição de ${rotularAula(aula)} falhou — não dá pra anexar.`,
        );
        return;
      }

      aoEscolher({
        tipo: "aula",
        sessaoId: aula.sessao_id,
        rotulo: rotularAula(aula),
        caracteres: transcricao.texto.length,
      });
      aoFechar();
    } catch {
      setErro("Não foi possível verificar a transcrição. Verifique a conexão.");
    } finally {
      setVerificandoId(null);
    }
  };

  return (
    <div className="border-border-default bg-surface flex flex-col gap-3 rounded-xl border p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-text text-sm font-extrabold">Anexar uma aula</h3>
        <button
          type="button"
          onClick={aoFechar}
          className="hover:bg-surface-2 -m-1 rounded-lg p-2 transition-colors"
          aria-label="Fechar o seletor de aula"
        >
          <IconFechar size={16} />
        </button>
      </div>

      {turmas.length > 0 && (
        <label className="border-border-default flex items-center gap-2.5 rounded-xl border px-3 py-2">
          <span className="flex-none" style={{ color: "var(--primary)" }} aria-hidden>
            <IconTurma size={15} />
          </span>
          <span className="sr-only">Escolher turma</span>
          <select
            value={turmaId ?? ""}
            onChange={(evento) => setTurmaId(Number(evento.target.value))}
            className="text-text w-full cursor-pointer appearance-none bg-transparent text-sm font-bold outline-none"
          >
            {turmas.map((turma) => (
              <option key={turma.id} value={turma.id}>
                {turma.nome}
              </option>
            ))}
          </select>
        </label>
      )}

      {erro && (
        <p
          className="text-xs font-semibold"
          style={{ color: "var(--warn-fg)" }}
          role="alert"
        >
          {erro}
        </p>
      )}

      {carregando ? (
        <p className="text-text-muted py-3 text-sm">Carregando aulas…</p>
      ) : turmas.length === 0 ? (
        <p className="text-text-muted py-3 text-sm leading-relaxed">
          Nenhuma turma cadastrada.
        </p>
      ) : aulas.length === 0 ? (
        <p className="text-text-muted py-3 text-sm leading-relaxed">
          Esta turma ainda não tem aulas encerradas.
        </p>
      ) : (
        <ul className="flex max-h-64 flex-col gap-1.5 overflow-y-auto">
          {aulas.map((aula) => {
            const verificando = verificandoId === aula.sessao_id;
            const horario = formatarIntervalo(aula.hora_inicio, aula.hora_fim);

            return (
              <li key={aula.sessao_id}>
                <button
                  type="button"
                  onClick={() => escolher(aula)}
                  disabled={verificandoId !== null}
                  className="border-border-default hover:bg-surface-2 flex w-full items-center gap-2.5 rounded-lg border px-3 py-2 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span className="text-text-muted flex-none" aria-hidden>
                    <IconCalendario size={15} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="text-text block truncate text-sm font-bold">
                      {rotularAula(aula)}
                    </span>
                    {horario && (
                      <span className="text-text-muted text-xs">{horario}</span>
                    )}
                  </span>
                  {verificando && (
                    <span className="text-text-muted flex-none text-xs font-semibold">
                      Verificando…
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
