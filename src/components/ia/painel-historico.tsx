"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import {
  IconBusca,
  IconLixeira,
  IconMais,
  IconSetaEsquerda,
  IconSetaDireita,
} from "@/components/ui/icons";
import type { Conversa } from "@/lib/types";

/**
 * O painel de historico do Cup AI — a coluna da direita do prototipo.
 *
 * Antes isto era uma secao "Ultimas conversas" empilhada ABAIXO do compositor,
 * com um botao "Ver todas". Virou painel lateral fixo que abre e fecha, como na
 * referencia: o professor procura uma conversa antiga enquanto escreve a
 * proxima, e pra isso a lista precisa estar ao LADO, nao no fim da rolagem.
 *
 * Quem rola e' a LISTA, e nao a coluna inteira: assim o "Nova conversa" no
 * rodape fica sempre visivel.
 */

/** Tira acentos dos dois lados da comparacao da busca. */
function semAcento(texto: string): string {
  // NFD separa a letra do acento; U+0300..U+036F e' o bloco dos acentos
  // combinantes que sobram. Escrito com ESCAPE, e nao com os caracteres
  // literais: acento combinante solto no meio do codigo e' invisivel no editor
  // e some em qualquer copia que erre o encoding.
  //
  // Em portugues isto nao e' detalhe: o professor digita "genetica" no meio da
  // frase e espera achar "genética". Sem isto a busca devolve zero, e quem
  // digitou sem acento conclui que a conversa nao existe.
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/**
 * Tempo desde a ultima mexida, no formato curto do prototipo ("há 2 h",
 * "ontem", "3 dias").
 *
 * O professor procura a conversa pelo "mexi nisso ontem" — a data absoluta
 * obriga a fazer a conta de cabeca.
 */
function tempoRelativo(timestamp: string): string {
  const entao = new Date(timestamp).getTime();
  if (Number.isNaN(entao)) return "";

  const minutos = Math.floor((Date.now() - entao) / 60000);
  if (minutos < 1) return "agora";
  if (minutos < 60) return `há ${minutos} min`;

  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `há ${horas} h`;

  const dias = Math.floor(horas / 24);
  if (dias === 1) return "ontem";
  if (dias < 30) return `${dias} dias`;

  const meses = Math.floor(dias / 30);
  return meses === 1 ? "há 1 mês" : `há ${meses} meses`;
}

type Props = {
  conversas: Conversa[];
  /** Conversa aberta agora, destacada na lista. Ausente na abertura. */
  conversaAtivaId?: number;
  aoApagar: (conversaId: number) => Promise<void>;
  /** Comeca uma conversa nova — limpa o campo e volta pra abertura. */
  aoNova: () => void;
  aoFechar: () => void;
};

export function PainelHistorico({
  conversas,
  conversaAtivaId,
  aoApagar,
  aoNova,
  aoFechar,
}: Props) {
  const [termo, setTermo] = useState("");
  // Confirmacao inline, uma por vez: apagar e' irreversivel, e `window.confirm`
  // trava o navegador inteiro (mesma decisao de `lista-conversas.tsx`).
  const [confirmandoId, setConfirmandoId] = useState<number | null>(null);
  const [apagandoId, setApagandoId] = useState<number | null>(null);

  // Filtro no cliente, como o resto do app ja' faz: a lista de conversas e'
  // curta e cabe inteira na memoria.
  const visiveis = useMemo(() => {
    const busca = semAcento(termo.trim());
    if (!busca) return conversas;
    return conversas.filter((c) => semAcento(c.titulo).includes(busca));
  }, [conversas, termo]);

  const apagar = async (conversaId: number) => {
    setApagandoId(conversaId);
    try {
      await aoApagar(conversaId);
      setConfirmandoId(null);
    } finally {
      setApagandoId(null);
    }
  };

  return (
    <aside className="historico" aria-label="Histórico de conversas">
      <div className="historico-topo">
        <h2>Histórico</h2>
        <button
          type="button"
          onClick={aoFechar}
          className="historico-fechar"
          aria-label="Esconder o histórico"
          aria-expanded="true"
        >
          {/* A seta aponta pro lado que a acao leva: o painel sai pela direita. */}
          <IconSetaDireita size={15} />
        </button>
      </div>

      <div className="busca">
        <IconBusca size={13} />
        <label className="sr-only" htmlFor="busca-conversa">
          Buscar nas conversas
        </label>
        <input
          id="busca-conversa"
          type="search"
          value={termo}
          onChange={(evento) => setTermo(evento.target.value)}
          placeholder="Buscar conversa…"
          autoComplete="off"
        />
      </div>

      {visiveis.length > 0 ? (
        <div className="historico-lista">
          {visiveis.map((conversa) => {
            const ativa = conversa.id === conversaAtivaId;
            const confirmando = confirmandoId === conversa.id;
            const apagando = apagandoId === conversa.id;

            return (
              <div key={conversa.id} className="conversa-linha">
                <Link
                  href={`/ia/${conversa.id}`}
                  className="conversa"
                  aria-current={ativa ? "true" : undefined}
                >
                  <span className="conversa-titulo">{conversa.titulo}</span>
                  <span className="conversa-meta">
                    <span>{tempoRelativo(conversa.atualizada_em)}</span>
                  </span>
                </Link>

                {confirmando ? (
                  <span className="conversa-confirma">
                    <button
                      type="button"
                      onClick={() => apagar(conversa.id)}
                      disabled={apagando}
                      className="conversa-apagar"
                    >
                      {apagando ? "Apagando…" : "Apagar"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmandoId(null)}
                      disabled={apagando}
                      className="conversa-cancelar"
                    >
                      Cancelar
                    </button>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmandoId(conversa.id)}
                    className="conversa-lixeira"
                    aria-label={`Apagar a conversa ${conversa.titulo}`}
                  >
                    <IconLixeira size={14} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="historico-vazio">
          {conversas.length === 0
            ? "Nenhuma conversa ainda."
            : "Nenhuma conversa com esse termo."}
        </p>
      )}

      <div className="historico-rodape">
        <button type="button" className="btn-nova" onClick={aoNova}>
          <IconMais size={14} />
          Nova conversa
        </button>
      </div>
    </aside>
  );
}

/**
 * A aba que reabre o painel: meia pastilha colada na borda direita.
 *
 * Fica FORA do painel de proposito — dentro dele, sumiria junto e nao haveria
 * como trazer o historico de volta.
 */
export function AbaHistorico({ aoAbrir }: { aoAbrir: () => void }) {
  return (
    <button
      type="button"
      onClick={aoAbrir}
      className="historico-abrir"
      aria-label="Mostrar o histórico"
      aria-expanded="false"
    >
      {/* Aponta pra esquerda: e' de la' que o painel volta. */}
      <IconSetaEsquerda size={15} />
    </button>
  );
}
