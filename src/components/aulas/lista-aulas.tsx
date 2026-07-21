"use client";

import { useMemo, useState } from "react";

import { IconBusca, IconCalendario } from "@/components/ui/icons";
import { APARENCIA_STATUS } from "@/lib/format";
import type { AulaCard, StatusEngajamento } from "@/lib/types";

import { CardAula } from "./card-aula";

type ListaAulasProps = {
  aulas: AulaCard[];
  nomeTurma: string;
};

type FiltroStatus = "todos" | StatusEngajamento;

/**
 * Lista de aulas com busca e filtros.
 *
 * Filtra no navegador o que a API ja devolveu — a rota entrega todas as aulas
 * da turma de uma vez, entao nao ha ida a rede por digito nem paginacao a
 * fazer. Se o volume crescer muito, isso migra para a API.
 */
export function ListaAulas({ aulas, nomeTurma }: ListaAulasProps) {
  const [busca, setBusca] = useState("");
  const [data, setData] = useState("");
  const [status, setStatus] = useState<FiltroStatus>("todos");

  const aulasFiltradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    return aulas.filter((aula) => {
      if (data && aula.data !== data) return false;
      if (status !== "todos" && aula.status !== status) return false;

      if (termo) {
        const alvo = `${nomeTurma} ${aula.dia_semana} ${aula.data} ${
          aula.resumo ?? ""
        }`.toLowerCase();
        if (!alvo.includes(termo)) return false;
      }

      return true;
    });
  }, [aulas, busca, data, status, nomeTurma]);

  const temFiltroAtivo = busca.trim() !== "" || data !== "" || status !== "todos";

  const limparFiltros = () => {
    setBusca("");
    setData("");
    setStatus("todos");
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Controles */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="border-border-default bg-surface flex min-w-[200px] flex-1 items-center gap-2.5 rounded-xl border px-4 py-2.5">
          <span className="text-text-muted flex-none">
            <IconBusca />
          </span>
          <input
            type="search"
            value={busca}
            onChange={(evento) => setBusca(evento.target.value)}
            placeholder="Buscar por dia, data ou resumo..."
            aria-label="Buscar aulas"
            className="text-text w-full min-w-0 border-none bg-transparent text-sm outline-none"
          />
        </div>

        <label className="border-border-default bg-surface flex items-center gap-2.5 rounded-xl border px-4 py-2.5">
          <span className="flex-none" style={{ color: "var(--primary)" }}>
            <IconCalendario />
          </span>
          <span className="sr-only">Filtrar por data</span>
          <input
            type="date"
            value={data}
            onChange={(evento) => setData(evento.target.value)}
            className="text-text bg-transparent text-sm font-bold outline-none"
          />
        </label>

        {temFiltroAtivo && (
          <button
            type="button"
            onClick={limparFiltros}
            className="text-text-brand hover:bg-surface-2 rounded-xl px-3 py-2.5 text-sm font-bold transition-colors"
          >
            Limpar filtros
          </button>
        )}
      </div>

      {/* Legenda das faixas, que tambem filtra ao ser clicada. */}
      <div className="flex flex-wrap items-center gap-2">
        {(
          [
            ["todos", "Todas", "var(--text-muted)"],
            ["alto", APARENCIA_STATUS.alto.rotulo, APARENCIA_STATUS.alto.cor],
            ["moderado", APARENCIA_STATUS.moderado.rotulo, APARENCIA_STATUS.moderado.cor],
            ["atencao", APARENCIA_STATUS.atencao.rotulo, APARENCIA_STATUS.atencao.cor],
          ] as const
        ).map(([chave, rotulo, cor]) => {
          const ativo = status === chave;

          return (
            <button
              key={chave}
              type="button"
              onClick={() => setStatus(chave)}
              aria-pressed={ativo}
              className={`flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs transition-colors ${
                ativo ? "font-extrabold" : "font-semibold"
              }`}
              style={{
                background: ativo ? "var(--surface-2)" : "transparent",
                color: ativo ? "var(--text)" : "var(--text-muted)",
                border: `1px solid ${ativo ? "var(--border-strong)" : "var(--border)"}`,
              }}
            >
              {chave !== "todos" && (
                <span
                  className="h-2 w-2 flex-none rounded-full"
                  style={{ background: cor }}
                  aria-hidden
                />
              )}
              {rotulo}
            </button>
          );
        })}
      </div>

      <h2
        className="text-text text-xl font-extrabold sm:text-2xl"
        style={{ fontFamily: "var(--font-geologica)" }}
      >
        Últimas aulas da turma
        <span className="text-text-muted ml-2 text-sm font-semibold">
          ({aulasFiltradas.length}
          {aulasFiltradas.length !== aulas.length && ` de ${aulas.length}`})
        </span>
      </h2>

      {aulasFiltradas.length === 0 ? (
        <p className="border-border-default text-text-muted rounded-2xl border border-dashed p-10 text-center text-sm">
          {aulas.length === 0
            ? "Esta turma ainda não teve aulas monitoradas."
            : "Nenhuma aula corresponde aos filtros."}
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {aulasFiltradas.map((aula) => (
            <CardAula key={aula.sessao_id} aula={aula} nomeTurma={nomeTurma} />
          ))}
        </div>
      )}
    </div>
  );
}
