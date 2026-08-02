import { MascoteCup } from "@/components/ia/mascote-cup";
import { TextoFormatado } from "@/components/ia/texto-formatado";
import { horaDoTimestamp } from "@/lib/format";
import type { MensagemConversa } from "@/lib/types";

/**
 * Reconhece um rotulo de aula entre os anexos gravados.
 *
 * O backend grava so' o texto ("Aula 31/07 · Biologia", "prova.pdf"), sem
 * dizer de que tipo era. O prefixo "Aula " e' o que a tela usa ao montar o
 * anexo (`montarAnexoDaAula`), entao serve de marca aqui — errar para menos
 * so' custa um chip neutro no lugar do calendario.
 */
function ehRotuloDeAula(rotulo: string): boolean {
  return /^Aula\s/i.test(rotulo);
}

type BolhaMensagemProps = {
  mensagem: MensagemConversa;
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
export function BolhaMensagem({ mensagem }: BolhaMensagemProps) {
  const doProfessor = mensagem.papel === "professor";
  const anexos = mensagem.anexos ?? [];

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
          {anexos.map((rotulo, indice) => (
            <li
              key={`${rotulo}-${indice}`}
              className="border-border-default bg-surface text-text max-w-full truncate rounded-xl border px-2.5 py-1.5 text-xs font-bold"
            >
              {ehRotuloDeAula(rotulo) && (
                <span className="text-text-muted mr-1.5" aria-hidden>
                  ▸
                </span>
              )}
              {rotulo}
            </li>
          ))}
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
