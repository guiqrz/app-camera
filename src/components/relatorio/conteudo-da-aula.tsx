"use client";

import { useEffect, useState } from "react";

import { TextoFormatado } from "@/components/ia/texto-formatado";
import {
  IconCheckSimples,
  IconInfo,
  IconLapis,
} from "@/components/ui/icons";
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

  // Os tres estados abaixo NAO desenham card proprio: quem desenha e' o
  // `BlocoColapsavel` em volta. Antes cada um trazia sua `<section>` com borda
  // e titulo, o que empilhava um card dentro do outro.
  if (carregando) {
    return (
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
    );
  }

  // Sem registro: a aula acabou de encerrar e o pos-sessao ainda nao rodou.
  // Nao ha o que editar aqui — a linha so' nasce no encerramento da sessao.
  if (conteudo === null) {
    return (
      <div className="flex flex-col gap-2">
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
      </div>
    );
  }

  // Registro existe mas nasceu vazio: nao houve audio nem quadro capturado.
  // O botao continua aparecendo — e' justamente o caso em que ele precisa
  // escrever o conteudo a mao.
  const semFonte = conteudo.fonte === "nenhuma";

  // SEM `<section>` nem cabecalho proprios: este componente agora mora dentro
  // do `BlocoColapsavel`, que ja' desenha o card, o titulo e a seta. Ter os
  // dois deixava um card dentro de outro, com dois titulos "Conteúdo da aula".
  return (
    <div className="flex w-full flex-col gap-3">
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
            <span className="text-text-muted text-xs font-semibold tracking-wide uppercase">
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
            <span className="text-text-muted text-xs font-semibold tracking-wide uppercase">
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
            <span className="text-text-muted text-xs font-semibold tracking-wide uppercase">
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
              className="text-text-on-brand rounded-xl px-4 py-2 text-xs font-semibold transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
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
              className="text-text-body border-border-default rounded-xl border px-4 py-2 text-xs font-semibold transition-colors hover:bg-[var(--surface-2)] disabled:cursor-not-allowed disabled:opacity-60"
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
            <ul className="mb-[17px] flex list-none flex-wrap gap-[7px] p-0">
              {conteudo.topicos.map((topico, i) => (
                <ChipTopico key={topico} texto={topico} indice={i} />
              ))}
            </ul>
          )}

          {conteudo.resumo !== "" && (
            <div>
              <p className="text-text-muted mb-[5px] text-[10.5px] font-semibold uppercase" style={{ letterSpacing: "0.06em" }}>
                Resumo
              </p>
              <div className="text-text-body max-w-[78ch] text-[13.5px] leading-[1.6]">
                {/* Mesmo formatador da conversa: o texto vem do modelo e pode
                    trazer negrito ou lista. */}
                <TextoFormatado texto={conteudo.resumo} />
              </div>
            </div>
          )}

          {/* "Parou em" ganha caixa própria: é o campo que a feature "onde
              parei nesta turma" lê, e o professor precisa achá-lo de relance. */}
          {conteudo.ate_onde !== "" && (
            <div
              className="flex items-start gap-[10px] rounded-[9px] border px-[13px] py-[11px]"
              style={{
                background: "var(--primary-soft)",
                borderColor: "var(--border-default)",
              }}
            >
              <span
                className="mt-px flex-none"
                style={{ color: "var(--primary)" }}
                aria-hidden
              >
                <IconCheckSimples size={15} />
              </span>
              <div>
                <p className="text-text-muted mb-[2px] text-[10.5px] font-semibold uppercase" style={{ letterSpacing: "0.06em" }}>
                  Parou em
                </p>
                <p className="text-text m-0 text-[13px] leading-[1.5]">
                  {conteudo.ate_onde}
                </p>
              </div>
            </div>
          )}

          {/* Procedência + o botão de editar na mesma linha, como no
              protótipo. O aviso some depois que ele edita: o texto passou a
              ser dele, e continuar pedindo pra conferir a própria escrita não
              faz sentido. */}
          <p className="text-text-muted mt-[13px] flex flex-wrap items-center gap-[6px] text-[11.5px]">
            {conteudo.editado_em === null ? (
              <>
                <span className="flex-none opacity-70" aria-hidden>
                  <IconInfo size={13} />
                </span>
                Gerado pela Cupcam a partir da transcrição e da lousa — confira
                antes de usar como registro.
              </>
            ) : (
              <>editado por você</>
            )}

            <button
              type="button"
              onClick={abrirEdicao}
              className="border-border-default text-text hover:bg-surface-2 ml-auto inline-flex items-center gap-[7px] rounded-[9px] border px-[13px] py-2 text-[12.5px] font-semibold transition-colors"
              style={{ background: "var(--surface-2)" }}
            >
              <IconLapis size={13} />
              {semFonte ? "Escrever conteúdo" : "Editar"}
            </button>
          </p>
        </>
      )}
    </div>
  );
}

/**
 * Um tópico em pastilha (`.topicos li`).
 *
 * A cor gira num ciclo de 5, então vale pra qualquer quantidade de tópicos.
 *
 * ⚠️ A cor aqui é DECORATIVA, não carrega significado — tópico não tem estado
 * bom/ruim. Por isso a dose é baixa (13% no fundo, 30% na borda) e o TEXTO
 * fica sempre em `--text-body`: se ele herdasse a cor, o contraste cairia e a
 * cor viraria informação falsa.
 */
function ChipTopico({ texto, indice }: { texto: string; indice: number }) {
  const TONS = [
    "var(--grafico)",
    "var(--primary)",
    "var(--grafico-verde)",
    "var(--grafico-ambar)",
    "var(--grafico-roxo)",
  ];
  const tom = TONS[indice % TONS.length];

  return (
    <li
      className="text-text-body rounded-full border px-3 py-[6px] text-[12.5px]"
      style={{
        background: `color-mix(in srgb, ${tom} 13%, transparent)`,
        borderColor: `color-mix(in srgb, ${tom} 30%, transparent)`,
      }}
    >
      {texto}
    </li>
  );
}
