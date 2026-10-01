"use client";

import { useCallback, useEffect, useId, useState, type ReactNode } from "react";

import { IconAlerta, IconBaixar, IconCalendario, IconCheck } from "@/components/ui/icons";
import { baixarBlob, nomeDoArquivoDoCabecalho } from "@/lib/baixar-arquivo";
import {
  dataCurta,
  minutosTotais,
  ROTULO_DA_BASE,
  urlDoArquivoDoPlano,
  type FormatoDoPlano,
} from "@/lib/plano-de-aula";
import type { PlanoDeAula } from "@/lib/types";

/** Quantos objetivos aparecem antes de abrir o plano completo. */
const OBJETIVOS_NO_RESUMO = 3;

const DOWNLOADS: { formato: FormatoDoPlano; rotulo: string }[] = [
  { formato: "docx", rotulo: "Baixar Word" },
  { formato: "pdf", rotulo: "Baixar PDF" },
];

type Estado =
  | { tipo: "carregando" }
  | { tipo: "erro"; mensagem: string }
  | { tipo: "pronto"; plano: PlanoDeAula };

/**
 * O caminho do "Gravar na agenda". `conflito` existe porque sobrescrever o
 * plano de um encontro nao tem volta: o professor ve o que ja' estava la'
 * antes de decidir, dentro do cartao (nunca num confirm() do navegador).
 */
type Agenda =
  | { tipo: "ocioso" }
  | { tipo: "gravando" }
  | { tipo: "conflito"; previa: string }
  | { tipo: "gravado" }
  | { tipo: "erro"; mensagem: string };

type CartaoPlanoDeAulaProps = { planoId: number };

/**
 * Um plano de aula que o Cup AI montou, embaixo da resposta dele (um cartao
 * por turma).
 *
 * Busca o plano SALVO ao montar, como o cartao da lista: o que aparece aqui e'
 * exatamente o que o Word e o PDF trazem, porque o backend monta o arquivo dos
 * mesmos campos. As recomendacoes ficam em destaque e com a base de cada uma
 * (onde parou, engajamento, transcricao): e' o que diferencia o plano de uma
 * turma do da outra, e o professor precisa saber de onde cada uma saiu.
 */
export function CartaoPlanoDeAula({ planoId }: CartaoPlanoDeAulaProps) {
  const [estado, setEstado] = useState<Estado>({ tipo: "carregando" });
  const [aberto, setAberto] = useState(false);
  // Um download de cada vez, pro botao dele virar "Gerando…".
  const [gerando, setGerando] = useState<FormatoDoPlano | null>(null);
  const [avisoDownload, setAvisoDownload] = useState<string | null>(null);
  const [agenda, setAgenda] = useState<Agenda>({ tipo: "ocioso" });
  const idDoDetalhe = useId();

  useEffect(() => {
    let cancelado = false;
    fetch(`/api/ia/planos/${planoId}`)
      .then(async (resposta) => {
        const corpo = (await resposta.json().catch(() => null)) as
          | PlanoDeAula
          | { erro?: string }
          | null;
        if (cancelado) return;
        if (!resposta.ok || corpo === null || !("campos" in corpo)) {
          const mensagem =
            corpo && "erro" in corpo && corpo.erro
              ? corpo.erro
              : "Não foi possível carregar o plano de aula.";
          setEstado({ tipo: "erro", mensagem });
          return;
        }
        setEstado({ tipo: "pronto", plano: corpo });
      })
      .catch(() => {
        if (!cancelado) {
          setEstado({ tipo: "erro", mensagem: "Não foi possível carregar o plano de aula." });
        }
      });
    return () => {
      cancelado = true;
    };
  }, [planoId]);

  // fetch + blob, e nao <a download>: com o link cru um erro virava download
  // falho e a mensagem da ponte nunca chegava ao professor (mesmo motivo do
  // cartao da lista).
  const baixar = useCallback(
    async (formato: FormatoDoPlano) => {
      setGerando(formato);
      setAvisoDownload(null);
      try {
        const resposta = await fetch(urlDoArquivoDoPlano(planoId, formato));
        if (!resposta.ok) {
          const corpo = (await resposta.json().catch(() => null)) as { erro?: string } | null;
          throw new Error(corpo?.erro ?? "Não foi possível gerar o arquivo. Tente de novo.");
        }
        const blob = await resposta.blob();
        baixarBlob(
          blob,
          nomeDoArquivoDoCabecalho(resposta.headers.get("content-disposition"), `plano.${formato}`),
        );
      } catch (erro) {
        setAvisoDownload(
          erro instanceof Error ? erro.message : "Não foi possível gerar o arquivo. Tente de novo.",
        );
      } finally {
        setGerando(null);
      }
    },
    [planoId],
  );

  const gravarNaAgenda = useCallback(
    async (substituir: boolean) => {
      setAgenda({ tipo: "gravando" });
      try {
        const resposta = await fetch(`/api/ia/planos/${planoId}/agenda`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ substituir }),
        });
        const corpo = (await resposta.json().catch(() => null)) as {
          motivo?: string;
          previa?: string;
          erro?: string;
        } | null;
        if (resposta.status === 409 && corpo?.motivo === "plano_existente") {
          setAgenda({ tipo: "conflito", previa: corpo.previa ?? "" });
          return;
        }
        if (resposta.status === 409) {
          setAgenda({
            tipo: "erro",
            mensagem: "Este plano não tem uma aula na grade para gravar.",
          });
          return;
        }
        if (!resposta.ok) {
          throw new Error(corpo?.erro ?? "Não foi possível gravar na agenda. Tente de novo.");
        }
        setAgenda({ tipo: "gravado" });
      } catch (erro) {
        setAgenda({
          tipo: "erro",
          mensagem:
            erro instanceof Error ? erro.message : "Não foi possível gravar na agenda. Tente de novo.",
        });
      }
    },
    [planoId],
  );

  if (estado.tipo === "carregando") {
    return (
      <div className="border-border-default bg-surface rounded-xl border p-4" aria-busy="true">
        <p className="text-text-muted text-xs">Carregando o plano de aula…</p>
      </div>
    );
  }

  if (estado.tipo === "erro") {
    return (
      <div className="border-border-default bg-surface rounded-xl border p-4" role="alert">
        <p className="text-xs font-semibold" style={{ color: "var(--danger-fg)" }}>
          {estado.mensagem}
        </p>
      </div>
    );
  }

  const { plano } = estado;
  const { campos } = plano;
  const total = minutosTotais(plano);
  const semData = plano.aula_id === null || plano.data === null;
  const ocupado = gerando !== null || agenda.tipo === "gravando";

  return (
    <section
      className="border-border-default bg-surface rounded-xl border p-4"
      aria-label={`Plano de aula: ${plano.turma}, ${plano.tema}`}
    >
      <header className="mb-3 flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
        <div className="min-w-0">
          <p className="text-text-muted text-[11px] font-semibold tracking-wide uppercase">
            Plano de aula · {dataCurta(plano.data)}
          </p>
          <h3 className="text-text mt-0.5 text-sm font-semibold">
            {plano.turma}
            <span className="text-text-muted font-normal"> — {plano.tema}</span>
          </h3>
        </div>
        {total > 0 && (
          <span className="text-text-muted text-xs tabular-nums">{total} min</span>
        )}
      </header>

      {campos.objetivos.length > 0 && (
        <ul className="text-text-body flex list-disc flex-col gap-1 pl-4 text-xs leading-relaxed">
          {campos.objetivos.slice(0, OBJETIVOS_NO_RESUMO).map((objetivo) => (
            <li key={objetivo}>{objetivo}</li>
          ))}
        </ul>
      )}

      {campos.metodologia.length > 0 && (
        <ol className="mt-3 flex flex-col gap-1.5">
          {campos.metodologia.map((etapa, indice) => (
            <li
              key={`${indice}-${etapa.etapa}`}
              className="border-border-default rounded-lg border px-3 py-2"
              style={{ background: "var(--surface-2)" }}
            >
              <p className="text-text text-xs font-semibold">
                {etapa.etapa || "—"}
                {etapa.minutos ? (
                  <span className="text-text-muted font-normal tabular-nums">
                    {" "}
                    · {etapa.minutos} min
                  </span>
                ) : null}
              </p>
              {aberto && etapa.descricao && (
                <p className="text-text-body mt-0.5 text-xs leading-relaxed">{etapa.descricao}</p>
              )}
            </li>
          ))}
        </ol>
      )}

      {campos.recomendacoes.length > 0 && (
        <div className="mt-3 rounded-lg px-3 py-2.5" style={{ background: "var(--primary-soft)" }}>
          <p className="text-text text-[11px] font-semibold">Para esta turma</p>
          <ul className="mt-1.5 flex flex-col gap-2">
            {campos.recomendacoes.map((recomendacao) => (
              <li key={recomendacao.texto} className="text-text-body text-xs leading-relaxed">
                {recomendacao.texto}{" "}
                <span className="border-border-default text-text-muted ml-0.5 inline-block rounded-full border px-1.5 py-px text-[10px] font-semibold whitespace-nowrap">
                  {ROTULO_DA_BASE[recomendacao.base]}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {aberto && (
        <div id={idDoDetalhe} className="mt-3 flex flex-col gap-3">
          <SecaoDoPlano titulo="Habilidades da BNCC">
            {campos.habilidades_bncc.length > 0 ? (
              <>
                <ListaSimples
                  itens={campos.habilidades_bncc.map((h) =>
                    h.descricao ? `${h.codigo} — ${h.descricao}` : h.codigo,
                  )}
                />
                <p className="text-text-muted mt-1 flex items-center gap-1 text-[11px]">
                  <span aria-hidden>
                    <IconAlerta size={12} />
                  </span>
                  Sugestão da IA — confira os códigos na BNCC
                </p>
              </>
            ) : (
              <Vazio />
            )}
          </SecaoDoPlano>
          <SecaoDoPlano titulo="Conteúdos">
            {campos.conteudos.length > 0 ? <ListaSimples itens={campos.conteudos} /> : <Vazio />}
          </SecaoDoPlano>
          <SecaoDoPlano titulo="Recursos">
            {campos.recursos.length > 0 ? <ListaSimples itens={campos.recursos} /> : <Vazio />}
          </SecaoDoPlano>
          <SecaoDoPlano titulo="Avaliação">
            {campos.avaliacao ? (
              <p className="text-text-body text-xs leading-relaxed">{campos.avaliacao}</p>
            ) : (
              <Vazio />
            )}
          </SecaoDoPlano>
        </div>
      )}

      <button
        type="button"
        onClick={() => setAberto((valor) => !valor)}
        aria-expanded={aberto}
        aria-controls={idDoDetalhe}
        className="text-text mt-3 text-xs font-semibold underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
      >
        {aberto ? "Ver menos" : "Ver plano completo"}
      </button>

      <div className="mt-3 flex flex-wrap gap-2">
        {DOWNLOADS.map(({ formato, rotulo }) => (
          <button
            key={formato}
            type="button"
            onClick={() => void baixar(formato)}
            disabled={ocupado}
            className="btn-acao justify-center"
          >
            <span aria-hidden>
              <IconBaixar size={13} />
            </span>
            {gerando === formato ? "Gerando…" : rotulo}
          </button>
        ))}
        <button
          type="button"
          onClick={() => void gravarNaAgenda(false)}
          disabled={ocupado || semData || agenda.tipo === "gravado" || agenda.tipo === "conflito"}
          className="btn-acao justify-center"
        >
          <span aria-hidden>
            {agenda.tipo === "gravado" ? <IconCheck size={13} /> : <IconCalendario size={13} />}
          </span>
          {agenda.tipo === "gravado"
            ? "Gravado na agenda"
            : agenda.tipo === "gravando"
              ? "Gravando…"
              : "Gravar na agenda"}
        </button>
      </div>

      {semData && (
        <p className="text-text-muted mt-2 text-[11px]">
          Sem aula na grade desta turma nesse dia — baixe o arquivo ou peça outra data ao Cup AI.
        </p>
      )}

      {agenda.tipo === "conflito" && (
        <div
          className="border-border-default mt-3 rounded-lg border p-3"
          style={{ background: "var(--surface-2)" }}
        >
          <p className="text-text text-xs font-semibold">Esta aula já tem um plano:</p>
          <blockquote className="text-text-body border-border-default mt-1.5 border-l-2 pl-2 text-xs leading-relaxed whitespace-pre-line">
            {agenda.previa}
          </blockquote>
          <div className="mt-2.5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void gravarNaAgenda(true)}
              className="btn-acao justify-center"
            >
              Substituir
            </button>
            <button
              type="button"
              onClick={() => setAgenda({ tipo: "ocioso" })}
              className="btn-acao justify-center"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Progresso anunciado sem roubar o foco; erro anuncia na hora. */}
      <p className="sr-only" aria-live="polite">
        {gerando !== null
          ? "Gerando o arquivo…"
          : agenda.tipo === "gravando"
            ? "Gravando na agenda…"
            : agenda.tipo === "gravado"
              ? "Plano gravado na agenda."
              : ""}
      </p>

      {(avisoDownload !== null || agenda.tipo === "erro") && (
        <p
          className="mt-2 text-[11px] font-semibold"
          style={{ color: "var(--danger-fg)" }}
          role="alert"
        >
          {agenda.tipo === "erro" ? agenda.mensagem : avisoDownload}
        </p>
      )}
    </section>
  );
}

function SecaoDoPlano({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div>
      <h4 className="text-text text-[11px] font-semibold tracking-wide uppercase">{titulo}</h4>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function ListaSimples({ itens }: { itens: string[] }) {
  return (
    <ul className="text-text-body flex list-disc flex-col gap-0.5 pl-4 text-xs leading-relaxed">
      {itens.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

/** Secao vazia aparece com travessao, nunca some: o professor ve o que falta. */
function Vazio() {
  return <p className="text-text-muted text-xs">—</p>;
}
