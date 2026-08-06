"use client";

import { useCallback, useEffect, useState } from "react";

import { IconRelatorios } from "@/components/ui/icons";
import type { DiarioDaAula } from "@/lib/types";

type DiarioDeClasseProps = {
  sessaoId: number;
};

/**
 * Diario de classe da aula, pronto pro professor copiar no sistema da escola.
 *
 * O texto vem MONTADO do backend, sem IA. A tela nao remonta nada a partir dos
 * campos estruturados: se ela montasse a sua propria versao, o que o professor
 * LE aqui poderia divergir do que ele COLA la', e o diario oficial da escola e'
 * o pior lugar possivel pra essa divergencia aparecer.
 *
 * O texto e' mostrado num <pre> justamente por isso — o que esta' na tela e' o
 * que vai pro clipboard, quebra de linha por quebra de linha.
 *
 * PRIVACIDADE: este bloco mostra os nomes de quem faltou (decisao do usuario em
 * 06/08/2026, registrada no CLAUDE.md do backend). Ele carrega presenca e
 * conteudo, e nada alem disso — nunca engajamento, nunca transcricao.
 */
export function DiarioDeClasse({ sessaoId }: DiarioDeClasseProps) {
  const [diario, setDiario] = useState<DiarioDaAula | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;

    const carregar = async () => {
      setCarregando(true);
      setErro(null);
      try {
        const resposta = await fetch(`/api/diario/${sessaoId}`);
        if (cancelado) return;
        if (!resposta.ok) {
          setErro("Não foi possível carregar o diário desta aula.");
          return;
        }
        const dados = (await resposta.json()) as DiarioDaAula;
        if (!cancelado) setDiario(dados);
      } catch {
        if (!cancelado) {
          setErro("Não foi possível carregar o diário. Verifique a conexão.");
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

  const copiar = useCallback(async () => {
    if (diario === null) return;
    try {
      await navigator.clipboard.writeText(diario.texto);
      setCopiado(true);
      setAviso(null);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // navigator.clipboard falha fora de HTTPS e quando o navegador nega a
      // permissao. O texto continua na tela e selecionavel — o aviso diz isso
      // em vez de deixar o professor achando que o botao esta quebrado.
      setAviso("Não foi possível copiar. Selecione o texto acima e copie manualmente.");
    }
  }, [diario]);

  if (carregando) {
    return (
      <section className="border-border-default bg-surface shadow-card flex flex-col gap-3 rounded-2xl border p-5">
        <Cabecalho />
        <p className="text-text-muted text-sm" role="status">
          Carregando o diário…
        </p>
      </section>
    );
  }

  if (diario === null) {
    return (
      <section className="border-border-default bg-surface shadow-card flex flex-col gap-2 rounded-2xl border p-5">
        <Cabecalho />
        <p
          className="text-xs font-semibold"
          style={{ color: "var(--danger-fg)" }}
          role="alert"
        >
          {erro ?? "Não foi possível carregar o diário desta aula."}
        </p>
      </section>
    );
  }

  return (
    <section className="border-border-default bg-surface shadow-card flex flex-col gap-4 rounded-2xl border p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Cabecalho />
        <span className="text-text-muted text-xs font-semibold">
          {resumoDaPresenca(diario)}
        </span>
      </div>

      {/* whitespace-pre-wrap preserva as quebras do texto do backend; o wrap
          evita rolagem horizontal no celular. */}
      <pre className="text-text-body bg-surface-2 max-h-96 overflow-y-auto rounded-xl p-4 text-sm leading-relaxed whitespace-pre-wrap">
        {diario.texto}
      </pre>

      {aviso !== null && (
        <p
          className="text-xs font-semibold"
          style={{ color: "var(--warn-fg)" }}
          role="status"
        >
          {aviso}
        </p>
      )}

      <button
        type="button"
        onClick={copiar}
        className="border-border-default text-text w-fit rounded-xl border px-4 py-2 text-xs font-extrabold transition-colors hover:bg-[var(--surface-2)]"
      >
        {copiado ? "Copiado!" : "Copiar diário"}
      </button>
    </section>
  );
}

function Cabecalho() {
  return (
    <div className="flex items-center gap-2.5">
      <span aria-hidden style={{ color: "var(--primary)" }}>
        <IconRelatorios size={20} />
      </span>
      <h2 className="text-text text-lg font-extrabold">Diário de classe</h2>
    </div>
  );
}

/** "23 de 28 presentes" no cabecalho, ou nada quando a turma esta vazia. */
function resumoDaPresenca(diario: DiarioDaAula): string {
  const { presentes, total } = diario.chamada;
  if (total === 0) return "";
  return `${presentes} de ${total} presentes`;
}
