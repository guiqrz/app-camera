"use client";

import { useState, useTransition } from "react";

import { IconCheckSimples, IconLixeira } from "@/components/ui/icons";
import type { Lembrete } from "@/lib/types";

/**
 * "AAAA-MM-DD" -> "14/08". Fatia a string em vez de usar `new Date`.
 *
 * `new Date("2026-08-14")` e' interpretado como MEIA-NOITE UTC, e no fuso do
 * Brasil (-03) isso volta pro dia 13 — o lembrete apareceria com a data errada
 * pra metade do dia. Fatiar nao tem fuso.
 */
function formatarData(iso: string) {
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}${ano !== String(new Date().getFullYear()) ? `/${ano}` : ""}`;
}

/** Comparacao de strings ISO ja e' cronologica — nao precisa virar Date. */
function estaVencida(iso: string) {
  const hoje = new Date();
  const local = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`;
  return iso < local;
}

type Props = {
  lembretes: Lembrete[];
  /** Avisa o dono da lista (`SecaoLembretes`) — e' ele quem guarda o estado. */
  aoMudar: React.Dispatch<React.SetStateAction<Lembrete[]>>;
};

/**
 * Recados do professor pra si mesmo na tela Minhas Aulas.
 *
 * Sem turma, sem prioridade e sem categoria DE PROPOSITO — ver o comentario da
 * tabela `lembretes` em banco.py. A ausencia e' o desenho.
 *
 * A LISTA VEM DE FORA (`SecaoLembretes`). Ela morava aqui, mas o card de
 * numero "Lembretes" precisa da MESMA contagem: com o estado preso neste
 * componente, criar um lembrete atualizava a lista e deixava o card exibindo o
 * numero velho.
 *
 * As escritas continuam OTIMISTAS: marcar como feito pinta na hora e desfaz se
 * a rede recusar — passar pelo servidor a cada clique deixaria o check lento.
 */
export function PainelLembretes({ lembretes, aoMudar: setLembretes }: Props) {
  const [texto, setTexto] = useState("");
  const [data, setData] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, iniciarEnvio] = useTransition();

  const abertos = lembretes.filter((l) => !l.feito).length;

  async function criar() {
    const limpo = texto.trim();
    if (!limpo) return;

    setErro(null);
    const resposta = await fetch("/api/lembretes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ texto: limpo, data: data || null }),
    });

    if (!resposta.ok) {
      setErro("Não foi possível salvar o lembrete.");
      return;
    }

    const { id } = (await resposta.json()) as { id: number };
    setLembretes((atuais) => [
      {
        id,
        texto: limpo,
        data: data || null,
        feito: false,
        criado_em: new Date().toISOString(),
      },
      ...atuais,
    ]);
    setTexto("");
    setData("");
  }

  async function alternarFeito(lembrete: Lembrete) {
    const novo = !lembrete.feito;
    // Otimista: pinta antes de a rede responder, desfaz se falhar.
    setLembretes((atuais) =>
      atuais.map((l) => (l.id === lembrete.id ? { ...l, feito: novo } : l)),
    );
    setErro(null);

    const resposta = await fetch(`/api/lembretes/${lembrete.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      // SO' `feito`. Mandar `data` aqui APAGARIA o prazo do lembrete — o
      // backend distingue campo ausente de campo nulo justamente pra isso.
      body: JSON.stringify({ feito: novo }),
    });

    if (!resposta.ok) {
      setLembretes((atuais) =>
        atuais.map((l) =>
          l.id === lembrete.id ? { ...l, feito: lembrete.feito } : l,
        ),
      );
      setErro("Não foi possível atualizar o lembrete.");
    }
  }

  async function remover(lembrete: Lembrete) {
    const antes = lembretes;
    setLembretes((atuais) => atuais.filter((l) => l.id !== lembrete.id));
    setErro(null);

    const resposta = await fetch(`/api/lembretes/${lembrete.id}`, {
      method: "DELETE",
    });
    if (!resposta.ok) {
      setLembretes(antes);
      setErro("Não foi possível apagar o lembrete.");
    }
  }

  return (
    <section
      className="bg-surface border-border-default overflow-hidden rounded-[12px] border"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      {/* Mesmo .card-topo da agenda: 15px 17px 11px, gap 10px, h2 16px. */}
      <div className="flex items-center gap-[10px] px-[17px] pt-[15px] pb-[11px]">
        {/* Mesmo motivo do card da agenda: `tracking-[-0.16px]` sai -0.24px. */}
        <h2
          className="text-text text-[16px] font-semibold"
          style={{ letterSpacing: "-0.16px" }}
        >
          Lembretes
        </h2>
        <span
          className="text-text-muted text-[12.5px] tabular-nums"
          style={{ fontWeight: 400 }}
        >
          {abertos === 0
            ? "nenhum aberto"
            : `${abertos} ${abertos === 1 ? "aberto" : "abertos"}`}
        </span>
      </div>

      {/* Linhas do prototipo: 9px 17px de respiro, gap 9px, texto 12.5px. */}
      <ul className="flex flex-col pt-[2px]">
        {lembretes.map((lembrete) => (
          <li
            key={lembrete.id}
            className="group flex items-start gap-[9px] px-[17px] py-[9px] text-[12.5px]"
            style={{ fontWeight: 400 }}
          >
            <button
              type="button"
              onClick={() => void alternarFeito(lembrete)}
              className="bg-surface-2 mt-[2px] grid h-[15px] w-[15px] flex-none place-items-center rounded-[5px] border transition-colors"
              style={
                lembrete.feito
                  ? {
                      background: "var(--primary)",
                      borderColor: "var(--primary)",
                      color: "var(--text-on-brand)",
                    }
                  : {
                      // Branca a 7%, como o `.lembrete-marca` do prototipo: a
                      // caixinha esta DENTRO do card de vidro, entao a borda e'
                      // o brilho da quina, mais fraca que a borda do card.
                      borderColor: "rgba(255, 255, 255, 0.07)",
                      // Transparente esconde o tique sem tirar o elemento do
                      // fluxo, entao a caixa nao muda de tamanho ao marcar.
                      color: "transparent",
                    }
              }
              aria-pressed={lembrete.feito}
              aria-label={
                lembrete.feito
                  ? `Desmarcar "${lembrete.texto}"`
                  : `Marcar "${lembrete.texto}" como feito`
              }
            >
              <IconCheckSimples size={9} />
            </button>

            <span
              className={`flex-1 ${lembrete.feito ? "text-text-muted line-through opacity-70" : "text-text"}`}
              style={{ fontWeight: 300 }}
            >
              {lembrete.texto}
            </span>

            {lembrete.data && (
              <span
                className="flex-none text-[11.5px] tabular-nums"
                style={{
                  fontWeight: 400,
                  color:
                    !lembrete.feito && estaVencida(lembrete.data)
                      ? "var(--danger-fg)"
                      : "var(--text-muted)",
                }}
              >
                {formatarData(lembrete.data)}
              </span>
            )}

            {/* -my-1 devolve o respiro que o padding do botao adiciona: sem
                isso a linha ficaria 3px mais alta que a do prototipo so' por
                causa de um controle que nem sempre esta visivel. */}
            <button
              type="button"
              onClick={() => void remover(lembrete)}
              className="text-text-muted hover:text-danger -my-1 flex-none rounded-lg p-1 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
              aria-label={`Apagar "${lembrete.texto}"`}
            >
              <IconLixeira size={14} />
            </button>
          </li>
        ))}
      </ul>

      <div className="border-border-default flex flex-wrap items-center gap-2 border-t px-5 py-3">
        <input
          type="text"
          value={texto}
          onChange={(evento) => setTexto(evento.target.value)}
          onKeyDown={(evento) => {
            if (evento.key === "Enter") {
              evento.preventDefault();
              iniciarEnvio(() => void criar());
            }
          }}
          placeholder="Escreva um lembrete…"
          maxLength={500}
          aria-label="Novo lembrete"
          className="text-text-body placeholder:text-text-muted min-w-[12rem] flex-1 bg-transparent text-sm outline-none"
        />
        <input
          type="date"
          value={data}
          onChange={(evento) => setData(evento.target.value)}
          aria-label="Data do lembrete (opcional)"
          className="text-text-muted bg-surface-2 border-border-default rounded-lg border px-2 py-1 text-xs"
        />
        <button
          type="button"
          onClick={() => iniciarEnvio(() => void criar())}
          disabled={!texto.trim() || enviando}
          className="rounded-lg px-3 py-1.5 text-xs font-semibold transition-opacity disabled:opacity-40"
          style={{ background: "var(--primary)", color: "var(--text-on-brand)" }}
        >
          Adicionar
        </button>
      </div>

      {erro && (
        <p
          className="px-5 pb-3 text-xs"
          style={{ color: "var(--danger-fg)" }}
          role="status"
        >
          {erro}
        </p>
      )}
    </section>
  );
}
