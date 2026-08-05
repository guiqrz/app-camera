"use client";

import { useEffect, useState } from "react";

import { TextoFormatado } from "@/components/ia/texto-formatado";
import { IconTranscricao } from "@/components/ui/icons";
import type { ConteudoDaAula as Conteudo } from "@/lib/types";

type ConteudoDaAulaProps = {
  sessaoId: number;
};

/**
 * O que foi ensinado na aula: topicos, resumo e ate onde a aula foi.
 *
 * Substitui o antigo ResumoDaAula. A diferenca que importa: aquele gerava sob
 * demanda e jogava fora; este LE um registro que ja foi gravado no fim da aula,
 * e e' a base das features "onde parei nesta turma", diario de classe e material
 * pro aluno que faltou.
 *
 * Card PROPRIO, e nao dentro da secao de transcricao como o resumo antigo
 * ficava: o registro existe tambem em aula SEM audio nenhum (so' com o quadro
 * capturado no modo Lousa), e gravar audio e' desligado por padrao. Enterrado
 * dentro da transcricao ele ficaria invisivel justamente no caso mais comum.
 */
export function ConteudoDaAula({ sessaoId }: ConteudoDaAulaProps) {
  const [conteudo, setConteudo] = useState<Conteudo | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [editando, setEditando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [rascunhoResumo, setRascunhoResumo] = useState("");
  const [rascunhoAteOnde, setRascunhoAteOnde] = useState("");
  const [rascunhoTopicos, setRascunhoTopicos] = useState<string[]>([]);
  const [topicoNovo, setTopicoNovo] = useState("");

  useEffect(() => {
    let cancelado = false;

    const carregar = async () => {
      setCarregando(true);
      setErro(null);
      try {
        const resposta = await fetch(`/api/conteudo/${sessaoId}`);
        if (cancelado) return;
        // 404 nao e' erro: a aula acabou de encerrar e o pos-sessao ainda nao
        // rodou. A tela mostra um aviso calmo, nao vermelho.
        if (resposta.status === 404) {
          setConteudo(null);
          return;
        }
        if (!resposta.ok) {
          setErro("Não foi possível carregar o conteúdo desta aula.");
          return;
        }
        const dados = (await resposta.json()) as Conteudo;
        if (!cancelado) setConteudo(dados);
      } catch {
        if (!cancelado) {
          setErro("Não foi possível carregar o conteúdo. Verifique a conexão.");
        }
      } finally {
        if (!cancelado) setCarregando(false);
      }
    };

    void carregar();
    return () => {
      cancelado = true;
    };
  }, [sessaoId]);

  const abrirEdicao = () => {
    if (conteudo === null) return;
    setRascunhoResumo(conteudo.resumo);
    setRascunhoAteOnde(conteudo.ate_onde);
    setRascunhoTopicos([...conteudo.topicos]);
    setTopicoNovo("");
    setErro(null);
    setEditando(true);
  };

  const adicionarTopico = () => {
    const limpo = topicoNovo.trim();
    // Ignora vazio e repetido em silencio: sao erros de digitacao, nao algo que
    // mereca mensagem de erro na tela.
    if (limpo === "" || rascunhoTopicos.includes(limpo)) return;
    setRascunhoTopicos([...rascunhoTopicos, limpo]);
    setTopicoNovo("");
  };

  const salvar = async () => {
    setSalvando(true);
    setErro(null);
    try {
      // O topico digitado mas nao confirmado com Enter entra mesmo assim:
      // perder o que ele acabou de escrever seria pior que aceitar.
      const pendente = topicoNovo.trim();
      const topicos =
        pendente !== "" && !rascunhoTopicos.includes(pendente)
          ? [...rascunhoTopicos, pendente]
          : rascunhoTopicos;

      const resposta = await fetch(`/api/conteudo/${sessaoId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topicos,
          resumo: rascunhoResumo,
          ate_onde: rascunhoAteOnde,
        }),
      });
      if (!resposta.ok) {
        const dados = (await resposta.json().catch(() => null)) as {
          erro?: string;
        } | null;
        setErro(dados?.erro ?? "Não foi possível salvar. Tente de novo.");
        return;
      }
      setConteudo((await resposta.json()) as Conteudo);
      setTopicoNovo("");
      setEditando(false);
    } catch {
      setErro("Não foi possível salvar. Verifique a conexão.");
    } finally {
      setSalvando(false);
    }
  };

  if (carregando) {
    return (
      <section
        className="border-border-default flex flex-col gap-3 rounded-2xl border p-5"
        style={{ background: "var(--surface)" }}
      >
        <div className="flex items-center gap-2.5" role="status">
          <span className="relative flex h-2.5 w-2.5 shrink-0" aria-hidden>
            <span
              className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
              style={{ background: "var(--primary)" }}
            />
            <span
              className="relative inline-flex h-2.5 w-2.5 rounded-full"
              style={{ background: "var(--primary)" }}
            />
          </span>
          <span className="text-text-muted text-sm font-semibold">
            Carregando o conteúdo da aula…
          </span>
        </div>
      </section>
    );
  }

  // Sem registro: a aula acabou de encerrar e o pos-sessao ainda nao rodou.
  // Nao ha o que editar aqui — a linha so' nasce no encerramento da sessao.
  if (conteudo === null) {
    return (
      <section
        className="border-border-default flex flex-col gap-2 rounded-2xl border p-5"
        style={{ background: "var(--surface)" }}
      >
        <Cabecalho />
        {erro !== null ? (
          <p
            className="text-xs font-semibold"
            style={{ color: "var(--danger-fg)" }}
            role="alert"
          >
            {erro}
          </p>
        ) : (
          <p className="text-text-muted text-sm leading-relaxed">
            O conteúdo desta aula ainda não foi registrado. Ele é gerado quando a
            aula termina.
          </p>
        )}
      </section>
    );
  }

  // Registro existe mas nasceu vazio: nao houve audio nem quadro capturado.
  // O botao continua aparecendo — e' justamente o caso em que ele precisa
  // escrever o conteudo a mao.
  const semFonte = conteudo.fonte === "nenhuma";

  return (
    <section
      className="border-border-default flex w-full flex-col gap-3 rounded-2xl border p-5"
      style={{ background: "var(--surface)" }}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Cabecalho />
        {conteudo.editado_em !== null && !editando && (
          <span className="text-text-muted text-xs font-semibold">
            · editado por você
          </span>
        )}
        {!editando && (
          <button
            type="button"
            onClick={abrirEdicao}
            className="text-text-muted hover:text-text-body ml-auto text-xs font-extrabold transition-colors"
          >
            {semFonte ? "Escrever conteúdo" : "Editar"}
          </button>
        )}
      </div>

      {erro !== null && (
        <p
          className="text-xs font-semibold"
          style={{ color: "var(--danger-fg)" }}
          role="alert"
        >
          {erro}
        </p>
      )}

      {editando ? (
        <>
          <label className="flex flex-col gap-1.5">
            <span className="text-text-muted text-xs font-bold tracking-wide uppercase">
              Tópicos
            </span>
            {rascunhoTopicos.length > 0 && (
              <ul className="flex flex-wrap gap-2">
                {rascunhoTopicos.map((topico) => (
                  <li
                    key={topico}
                    className="text-text-body flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold"
                    style={{ background: "var(--surface-soft)" }}
                  >
                    {topico}
                    <button
                      type="button"
                      onClick={() =>
                        setRascunhoTopicos(
                          rascunhoTopicos.filter((t) => t !== topico),
                        )
                      }
                      aria-label={`Remover ${topico}`}
                      className="text-text-muted hover:text-text-body transition-colors"
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <input
              type="text"
              value={topicoNovo}
              onChange={(evento) => setTopicoNovo(evento.target.value)}
              onKeyDown={(evento) => {
                if (evento.key === "Enter") {
                  // Sem isto o Enter submete o formulario em volta e a tela
                  // recarrega, perdendo o que ele escreveu.
                  evento.preventDefault();
                  adicionarTopico();
                }
              }}
              placeholder="Digite um tópico e aperte Enter"
              className="border-border-default text-text-body rounded-lg border px-3 py-2 text-sm"
              style={{ background: "var(--surface-2)" }}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-text-muted text-xs font-bold tracking-wide uppercase">
              Resumo
            </span>
            <textarea
              value={rascunhoResumo}
              onChange={(evento) => setRascunhoResumo(evento.target.value)}
              rows={5}
              className="border-border-default text-text-body rounded-lg border px-3 py-2 text-sm leading-relaxed"
              style={{ background: "var(--surface-2)" }}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-text-muted text-xs font-bold tracking-wide uppercase">
              Parou em
            </span>
            <input
              type="text"
              value={rascunhoAteOnde}
              onChange={(evento) => setRascunhoAteOnde(evento.target.value)}
              placeholder="Onde a aula parou, para retomar na próxima"
              className="border-border-default text-text-body rounded-lg border px-3 py-2 text-sm"
              style={{ background: "var(--surface-2)" }}
            />
          </label>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={salvar}
              disabled={salvando}
              className="text-text-on-brand rounded-xl px-4 py-2 text-xs font-extrabold transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              style={{ background: "var(--primary)" }}
            >
              {salvando ? "Salvando…" : "Salvar"}
            </button>
            <button
              type="button"
              onClick={() => {
                setEditando(false);
                setErro(null);
              }}
              disabled={salvando}
              className="text-text-body border-border-default rounded-xl border px-4 py-2 text-xs font-extrabold transition-colors hover:bg-[var(--surface-2)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancelar
            </button>
          </div>
        </>
      ) : semFonte ? (
        <p className="text-text-muted text-sm leading-relaxed">
          Esta aula não teve áudio gravado nem quadro capturado, então não houve
          o que registrar automaticamente. Você pode escrever o conteúdo à mão.
        </p>
      ) : (
        <>
          {conteudo.topicos.length > 0 && (
            <ul className="flex flex-wrap gap-2">
              {conteudo.topicos.map((topico) => (
                <li
                  key={topico}
                  className="text-text-body rounded-lg px-2.5 py-1 text-xs font-semibold"
                  style={{ background: "var(--surface-soft)" }}
                >
                  {topico}
                </li>
              ))}
            </ul>
          )}

          {conteudo.resumo !== "" && (
            <div className="text-text-body text-sm leading-relaxed">
              {/* Mesmo formatador da conversa: o texto vem do modelo e pode
                  trazer negrito ou lista. */}
              <TextoFormatado texto={conteudo.resumo} />
            </div>
          )}

          {conteudo.ate_onde !== "" && (
            <p className="text-text-body text-sm leading-relaxed">
              <span className="font-bold">Parou em:</span> {conteudo.ate_onde}
            </p>
          )}

          {/* O aviso some depois que ele edita: o texto passou a ser dele, e
              continuar pedindo pra conferir a propria escrita nao faz sentido. */}
          {conteudo.editado_em === null && (
            <p className="text-text-muted text-xs leading-relaxed">
              Gerado por IA a partir da transcrição automática — confira antes de
              usar como registro da aula.
            </p>
          )}
        </>
      )}
    </section>
  );
}

/** Titulo do card. Repetido nos tres estados, entao mora numa funcao so'. */
function Cabecalho() {
  return (
    <div className="flex items-center gap-2">
      <span aria-hidden style={{ color: "var(--primary)" }}>
        <IconTranscricao size={18} />
      </span>
      <h2 className="text-text text-base font-extrabold">Conteúdo da aula</h2>
    </div>
  );
}
