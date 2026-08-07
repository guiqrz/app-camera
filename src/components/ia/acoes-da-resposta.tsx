"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { IconBaixar, IconCopiar } from "@/components/ui/icons";
import { dataDoTimestamp } from "@/lib/format";

/** Quanto tempo o "Copiado!" fica na tela, igual ao diario de classe. */
const MS_DO_AVISO_DE_COPIA = 2000;

type AcoesDaRespostaProps = {
  /** O texto CRU da mensagem — o mesmo que o formatador desenha na tela. */
  texto: string;
  /** `criada_em` da mensagem; vira a data no nome do arquivo baixado. */
  criadaEm: string;
};

/**
 * Copiar e baixar, embaixo de uma resposta do Cup AI.
 *
 * Existe pra feature E (material pro aluno): o professor pede um resumo das
 * ultimas aulas e precisa TIRAR aquilo do chat pra levar pro aluno. Sem isso
 * ele seleciona o texto com o mouse, e material longo com titulo e lista quase
 * nunca sobrevive a essa selecao inteiro.
 *
 * O que sai daqui e' o texto CRU da mensagem, nao o HTML desenhado por
 * `TextoFormatado`: o que ele cola no Word ou manda no grupo tem que ser o
 * mesmo `**negrito**` e `- lista` que o modelo escreveu, e nao um <strong> que
 * so' faz sentido dentro desta tela.
 *
 * Nao ha rota nova no backend de proposito — o texto ja' esta no navegador, e
 * mandar de volta pro servidor so' pra ele devolver o mesmo texto num arquivo
 * seria uma ida e volta sem nenhum ganho.
 */
export function AcoesDaResposta({ texto, criadaEm }: AcoesDaRespostaProps) {
  const [copiado, setCopiado] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  // O timeout do "Copiado!" precisa morrer junto com o componente: a conversa
  // troca de tela e o setState cairia num componente ja' desmontado.
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) clearTimeout(timeoutRef.current);
    };
  }, []);

  const copiar = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setAviso(null);
      if (timeoutRef.current !== null) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setCopiado(false), MS_DO_AVISO_DE_COPIA);
    } catch {
      // navigator.clipboard falha fora de HTTPS e quando o navegador nega a
      // permissao — mesmo tratamento do diario de classe. O texto continua na
      // tela e selecionavel, e o aviso diz isso em vez de deixar o professor
      // achando que o botao quebrou.
      setAviso("Não foi possível copiar. Selecione o texto acima e copie manualmente.");
    }
  }, [texto]);

  const baixar = useCallback(() => {
    // Blob com charset explicito: sem ele, acento vira caractere quebrado ao
    // abrir o arquivo em editor que assume a codificacao do sistema.
    const blob = new Blob([texto], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `material-${dataDoTimestamp(criadaEm)}.md`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    // Sem o revoke o blob fica vivo ate' a aba fechar. Numa conversa longa,
    // baixar varios materiais seguraria todos eles na memoria.
    URL.revokeObjectURL(url);
  }, [texto, criadaEm]);

  return (
    <div className="mt-2 flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-1.5">
        <BotaoDeAcao onClick={copiar} rotulo={copiado ? "Copiado!" : "Copiar"}>
          <IconCopiar size={13} />
        </BotaoDeAcao>

        <BotaoDeAcao onClick={baixar} rotulo="Baixar">
          <IconBaixar size={13} />
        </BotaoDeAcao>
      </div>

      {/* role="status" pro leitor de tela anunciar o "Copiado!" e o aviso de
          erro — sem isso, quem nao ve a mudanca de rotulo nao sabe se a copia
          funcionou. */}
      <p role="status" className="sr-only">
        {copiado ? "Texto copiado." : ""}
      </p>

      {aviso !== null && (
        <p
          className="text-[11px] font-semibold"
          style={{ color: "var(--warn-fg)" }}
          role="alert"
        >
          {aviso}
        </p>
      )}
    </div>
  );
}

type BotaoDeAcaoProps = {
  onClick: () => void;
  rotulo: string;
  children: React.ReactNode;
};

/**
 * Botao discreto de acao, com icone e texto.
 *
 * Discreto de proposito: estas acoes acompanham TODA resposta do assistente, e
 * um par de botoes cheios embaixo de cada uma competiria com o proprio texto
 * pela atencao — a resposta e' o conteudo, o botao e' ferramenta.
 */
function BotaoDeAcao({ onClick, rotulo, children }: BotaoDeAcaoProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-text-muted hover:text-text flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-bold transition-colors hover:bg-[var(--surface-2)]"
    >
      <span aria-hidden>{children}</span>
      {rotulo}
    </button>
  );
}
