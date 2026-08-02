import { TextoFormatado } from "@/components/ia/texto-formatado";
import { horaDoTimestamp } from "@/lib/format";
import type { MensagemConversa } from "@/lib/types";

type BolhaMensagemProps = {
  mensagem: MensagemConversa;
};

/**
 * Uma mensagem da conversa, alinhada conforme quem escreveu.
 *
 * Professor a' direita com o fundo da marca, assistente a' esquerda em
 * superficie neutra — o mesmo par de pistas (lado + cor) que todo aplicativo de
 * conversa usa. Duas pistas e nao uma porque so' a cor falha pra quem nao
 * distingue bem tons, e so' o lado falha em telas estreitas.
 *
 * `whitespace-pre-wrap` porque a resposta do modelo vem com quebras de linha e
 * listas em texto puro: sem isso tudo virava um paragrafo unico e ilegivel.
 */
export function BolhaMensagem({ mensagem }: BolhaMensagemProps) {
  const doProfessor = mensagem.papel === "professor";

  return (
    <div
      className={`flex flex-col gap-1 ${doProfessor ? "items-end" : "items-start"}`}
    >
      {/* O rotulo textual e' o que um leitor de tela usa: o alinhamento e a cor
          nao existem pra quem ouve a tela. */}
      <span className="text-text-muted px-1 text-xs font-bold">
        {doProfessor ? "Você" : "Cup AI"}
      </span>

      <div
        className={`flex max-w-[85%] flex-col gap-2 rounded-2xl px-4 py-3 text-sm leading-relaxed sm:max-w-[75%] ${
          doProfessor ? "text-text-on-brand" : "border-border-default text-text-body border"
        }`}
        style={doProfessor ? { background: "var(--primary)" } : { background: "var(--surface-2)" }}
      >
        {/* O que foi anexado, DENTRO da bolha e acima do texto: reabrindo a
            conversa dias depois, a pergunta sozinha nao diz sobre qual aula ou
            arquivo ela era. So' o rotulo — o arquivo nao fica guardado, entao
            nao ha o que abrir. */}
        {mensagem.anexos && mensagem.anexos.length > 0 && (
          <ul className="flex flex-wrap gap-1.5">
            {mensagem.anexos.map((rotulo, indice) => (
              <li
                key={`${rotulo}-${indice}`}
                className={`max-w-full truncate rounded-lg px-2 py-1 text-xs font-bold ${
                  doProfessor ? "bg-white/20" : "bg-surface border-border-default border"
                }`}
              >
                {rotulo}
              </li>
            ))}
          </ul>
        )}

        {/* So' a resposta do assistente passa pelo formatador: o que o
            professor digitou aparece exatamente como ele escreveu — se ele usou
            um asterisco, era um asterisco. */}
        {doProfessor ? (
          <span className="whitespace-pre-wrap">{mensagem.texto}</span>
        ) : (
          <TextoFormatado texto={mensagem.texto} />
        )}
      </div>

      <span className="text-text-muted px-1 text-[11px]">
        {horaDoTimestamp(mensagem.criada_em)}
      </span>
    </div>
  );
}
