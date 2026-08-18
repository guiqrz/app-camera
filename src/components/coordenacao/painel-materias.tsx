"use client";

import { useState } from "react";

import { BotaoIcone } from "@/components/ui/botao-icone";
import { EtiquetaMateria } from "@/components/ui/etiqueta-materia";
import { IconCheck, IconFechar, IconLapis, IconLixeira, IconMais } from "@/components/ui/icons";
import type { Materia } from "@/lib/types";

type PainelMateriasProps = {
  /** Materias cadastradas, ja ordenadas pelo backend. */
  materias: Materia[];
  /** true enquanto a lista esta sendo buscada. */
  carregando?: boolean;
  /** Mensagem de falha ao buscar ou ao excluir. Nulo quando esta tudo certo. */
  erro?: string | null;
  aoNovaMateria: () => void;
  aoEditarMateria: (materia: Materia) => void;
  /** Exclui de fato — a confirmacao de 1 clique acontece aqui no painel. */
  aoExcluirMateria: (materia: Materia) => void;
};

/**
 * Painel "Matérias" — a lista global de materias da escola.
 *
 * Materia nao pertence a turma nenhuma: e' um catalogo compartilhado que
 * alimenta o dropdown do `FormularioAula`, na grade semanal da pagina da
 * turma. Por isso o painel fica numa secao propria, fora da coluna da turma
 * selecionada.
 *
 * Componente burro no que importa: nao busca nem grava nada, so' recebe a
 * lista e devolve as intencoes por callback. O unico estado local e' de UI
 * pura — qual materia esta com a exclusao pendente de confirmacao.
 *
 * Diferente da aula, o DELETE de materia PODE falhar (409 quando alguma aula
 * usa a materia). A confirmacao inline continua valendo, mas a mensagem de
 * bloqueio volta pela prop `erro`, montada pela vista com o total de aulas.
 *
 * PESO VISUAL de proposito baixo: materia e' um catalogo que o coordenador
 * mexe raramente, entao a secao nao usa card com sombra nem botao solido —
 * isso a deixava competindo com turmas e alunos, que sao o trabalho do dia a
 * dia. Aqui e' uma lista de chips, so' com um filete separando do resto.
 */
export function PainelMaterias({
  materias,
  carregando = false,
  erro = null,
  aoNovaMateria,
  aoEditarMateria,
  aoExcluirMateria,
}: PainelMateriasProps) {
  const [materiaParaExcluirId, setMateriaParaExcluirId] = useState<number | null>(null);

  return (
    <section className="flex flex-col gap-3 pt-1" style={{ borderTop: "1px solid var(--border)" }}>
      <div className="flex flex-wrap items-center justify-between gap-2 pt-3">
        <div className="flex items-baseline gap-2">
          <h2 className="text-text-muted text-xs font-semibold tracking-wide uppercase">
            Matérias
          </h2>
          <span className="text-text-muted text-xs">
            usadas por todas as turmas ao cadastrar uma aula
          </span>
        </div>

        {/* Vidro, como as outras acoes da tela. Antes era so' texto colorido:
            ficava mais fraco que "Nova turma" e "Adicionar aluno", que sao
            acoes do mesmo peso. */}
        <button type="button" onClick={aoNovaMateria} className="btn-acao vidro centrado">
          <IconMais size={13} />
          Nova matéria
        </button>
      </div>

      {/* Falha aparece acima da lista: a lista anterior pode ainda estar na
          tela, e o usuario precisa saber que ela esta velha (ou que a exclusao
          que ele acabou de confirmar foi barrada). */}
      {erro && (
        <p
          role="alert"
          className="rounded-xl px-4 py-3 text-sm font-semibold"
          style={{ background: "var(--danger-bg)", color: "var(--danger-fg)" }}
        >
          {erro}
        </p>
      )}

      {carregando && materias.length === 0 ? (
        <p className="text-text-muted py-2 text-xs">Carregando matérias...</p>
      ) : materias.length === 0 ? (
        <p className="text-text-muted py-2 text-xs">
          Nenhuma matéria cadastrada. Cadastre-as para poder vinculá-las às aulas da grade.
        </p>
      ) : (
        <ul
          className="flex flex-wrap gap-1.5"
          // Enquanto recarrega, a lista antiga fica visivel mas apagada — o
          // usuario ve que o conteudo esta sendo atualizado.
          style={{ opacity: carregando ? 0.55 : 1 }}
        >
          {materias.map((materia) => {
            const armada = materiaParaExcluirId === materia.id;
            return (
              <li
                key={materia.id}
                className="flex items-center gap-2 rounded-lg py-1 pr-1 pl-2"
                style={{
                  background: "var(--surface-2)",
                  border: armada ? "1.5px solid var(--danger)" : "1.5px solid transparent",
                }}
              >
                <EtiquetaMateria
                  nome={materia.nome}
                  cor={materia.cor}
                  className="text-xs"
                />

                {/* Alvo de toque reduzido a 32px: sao dois botoes colados dentro
                    de uma etiqueta compacta, e 44px fariam as areas invisiveis
                    se sobreporem — uma roubaria o clique da outra. 32 e' o maior
                    que ainda separa os vizinhos com o gap-2 do container. */}
                {armada ? (
                  <>
                    <span
                      className="ml-1 text-[11px] font-semibold"
                      style={{ color: "var(--danger)" }}
                    >
                      Excluir?
                    </span>
                    <BotaoIcone
                      rotulo={`Confirmar exclusão da matéria ${materia.nome}`}
                      aoClicar={() => {
                        setMateriaParaExcluirId(null);
                        aoExcluirMateria(materia);
                      }}
                      tamanho={24}
                      alvo={32}
                      fundo="var(--danger)"
                      className="text-white"
                    >
                      <IconCheck size={13} />
                    </BotaoIcone>
                    <BotaoIcone
                      rotulo="Cancelar exclusão"
                      aoClicar={() => setMateriaParaExcluirId(null)}
                      tamanho={24}
                      alvo={32}
                      cor="var(--text-muted)"
                    >
                      <IconFechar size={13} />
                    </BotaoIcone>
                  </>
                ) : (
                  <>
                    <BotaoIcone
                      rotulo={`Editar matéria ${materia.nome}`}
                      aoClicar={() => aoEditarMateria(materia)}
                      tamanho={24}
                      alvo={32}
                      cor="var(--text-muted)"
                    >
                      <IconLapis size={13} />
                    </BotaoIcone>
                    <BotaoIcone
                      rotulo={`Excluir matéria ${materia.nome}`}
                      aoClicar={() => setMateriaParaExcluirId(materia.id)}
                      tamanho={24}
                      alvo={32}
                      cor="var(--danger)"
                    >
                      <IconLixeira size={13} />
                    </BotaoIcone>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
