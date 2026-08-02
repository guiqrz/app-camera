"use client";

import { useEffect, useState } from "react";

import { MascoteCup } from "@/components/ia/mascote-cup";
import { TextoFormatado } from "@/components/ia/texto-formatado";
import { IconCalendario } from "@/components/ui/icons";
import { buscarImagemDaSessao } from "@/lib/imagens-da-sessao";
import { horaDoTimestamp } from "@/lib/format";
import type { MensagemConversa } from "@/lib/types";

/**
 * Descobre o tipo do anexo pelo rotulo gravado.
 *
 * O backend guarda so' o TEXTO ("Aula 31/07 · Biologia", "prova.pdf") — o
 * arquivo em si nunca e' persistido. Entao o tipo e' deduzido daqui: o prefixo
 * "Aula " e' o que `montarAnexoDaAula` usa, e o resto sai da extensao.
 *
 * Errar para menos so' custa um icone generico no lugar do certo.
 */
function classificarRotulo(rotulo: string): {
  tipo: "aula" | "imagem" | "arquivo";
  extensao: string | null;
} {
  if (/^Aula\s/i.test(rotulo)) return { tipo: "aula", extensao: null };

  const extensao = /\.([a-z0-9]+)$/i.exec(rotulo)?.[1]?.toUpperCase() ?? null;
  const ehImagem = extensao
    ? ["PNG", "JPG", "JPEG", "GIF", "WEBP"].includes(extensao)
    : false;

  return { tipo: ehImagem ? "imagem" : "arquivo", extensao };
}

type BolhaMensagemProps = {
  mensagem: MensagemConversa;
  /** Conversa a que a mensagem pertence — chaveia a miniatura da imagem. */
  conversaId: number;
};

/**
 * Uma mensagem da conversa, com desenho diferente para cada lado.
 *
 * A pergunta do professor fica em bolha, alinhada a' direita. A resposta do
 * assistente NAO fica em bolha: vira coluna de leitura de largura plena, com o
 * mascote de avatar. A assimetria e' proposital — a pergunta e' uma frase e a
 * resposta e' texto longo com titulo, lista e negrito. Espremer isso numa
 * bolha de 75% da largura era o principal motivo de a tela parecer aplicativo
 * de conversa em vez de assistente.
 */
export function BolhaMensagem({ mensagem, conversaId }: BolhaMensagemProps) {
  const doProfessor = mensagem.papel === "professor";
  const anexos = mensagem.anexos ?? [];

  // As miniaturas vivem so' na memoria do navegador, entao sao lidas DEPOIS
  // da montagem: le-las durante o render faria o HTML do servidor (sempre sem
  // imagem) divergir do primeiro desenho do cliente.
  //
  // O setTimeout(0) e' o mesmo padrao de `header.tsx` e `vista-camera.tsx`: o
  // lint le' o setState sincrono como recalculo derivavel, mas isto e' leitura
  // de um sistema externo (o cache de blobs).
  const [montado, setMontado] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setMontado(true), 0);
    return () => clearTimeout(id);
  }, []);

  if (!doProfessor) {
    return (
      <div className="flex items-start gap-3">
        {/* Sem disco de fundo: o mascote ja' tem silhueta propria, e um circulo
            atras so' somaria um contorno competindo com a xicara. A margem
            negativa corta o vao vazio do viewBox pro desenho alinhar com o
            nome em vez de flutuar acima dele. */}
        <span className="-my-2 -mr-1 flex-none">
          <MascoteCup size={38} />
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-text-muted mb-1.5 text-xs font-extrabold">Cup AI</p>
          <div className="text-text-body text-sm leading-[1.75]">
            <TextoFormatado texto={mensagem.texto} />
          </div>
          <p className="text-text-muted mt-1.5 text-[11px]">
            {horaDoTimestamp(mensagem.criada_em)}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      {/* O que foi anexado, ACIMA da bolha: reabrindo a conversa dias depois, a
          pergunta sozinha nao diz sobre qual aula ou arquivo ela era. So' o
          rotulo — o arquivo nao fica guardado, entao nao ha o que abrir. */}
      {anexos.length > 0 && (
        <ul className="flex max-w-[85%] flex-wrap justify-end gap-1.5">
          {anexos.map((rotulo, indice) => {
            const { tipo, extensao } = classificarRotulo(rotulo);
            const miniatura =
              montado && tipo === "imagem"
                ? buscarImagemDaSessao(conversaId, rotulo)
                : null;

            return (
              <li
                key={`${rotulo}-${indice}`}
                className="border-border-default bg-surface flex max-w-full items-center gap-2 rounded-xl border p-1.5 pr-2.5"
              >
                {tipo === "aula" ? (
                  <span
                    className="bg-surface-2 text-text-muted grid h-8 w-8 flex-none place-items-center rounded-lg"
                    aria-hidden
                  >
                    <IconCalendario size={15} />
                  </span>
                ) : miniatura ? (
                  /* A propria imagem enviada, enquanto ela existir nesta
                     sessao. Depois de um refresh cai no selo com a extensao —
                     o arquivo nao fica guardado no servidor. */
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={miniatura}
                    alt=""
                    className="border-border-default h-8 w-8 flex-none rounded-lg border object-cover"
                  />
                ) : (
                  <span
                    className="grid h-8 w-8 flex-none place-items-center rounded-lg text-[9px] font-black"
                    style={
                      extensao === "PDF"
                        ? { background: "var(--danger-bg)", color: "var(--danger-fg)" }
                        : { background: "var(--surface-2)", color: "var(--text-muted)" }
                    }
                    aria-hidden
                  >
                    {extensao ?? "DOC"}
                  </span>
                )}

                <span className="min-w-0">
                  <span className="text-text block max-w-[190px] truncate text-xs font-bold">
                    {rotulo}
                  </span>
                  <span className="text-text-muted text-[10.5px]">
                    {tipo === "aula"
                      ? "Aula anexada"
                      : tipo === "imagem"
                        ? "Imagem"
                        : (extensao ?? "Arquivo")}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {/* O canto inferior direito fica reto: aponta para quem escreveu, a mesma
          pista que todo aplicativo de conversa usa. */}
      <div
        className="text-text-on-brand max-w-[85%] rounded-2xl rounded-br-md px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap sm:max-w-[75%]"
        style={{ background: "var(--primary)" }}
      >
        {/* O que o professor digitou aparece exatamente como ele escreveu — se
            usou um asterisco, era um asterisco. So' a resposta do assistente
            passa pelo formatador. */}
        {mensagem.texto}
      </div>

      <p className="text-text-muted text-[11px]">
        {horaDoTimestamp(mensagem.criada_em)}
      </p>
    </div>
  );
}
