"use client";

import { forwardRef, useId, type InputHTMLAttributes } from "react";

/** Seletor dos elementos que entram na ordem de tabulacao do navegador. */
const TABULAVEIS =
  'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * Acha o proximo elemento tabulavel depois de `atual`, na ordem do documento.
 *
 * Ordem do DOM em vez de `tabindex` explicito: os formularios deste projeto
 * nao usam tabindex positivo (que reordenaria a navegacao), entao a ordem do
 * documento e' exatamente a ordem que o navegador seguiria sozinho.
 *
 * Devolve `null` quando `atual` e' o ultimo — nesse caso quem chama deixa o
 * Tab nativo agir e o foco sai do formulario normalmente.
 */
function proximoTabulavel(atual: HTMLElement): HTMLElement | null {
  const todos = [...document.querySelectorAll<HTMLElement>(TABULAVEIS)].filter(
    (elemento) =>
      !elemento.hasAttribute("disabled") &&
      elemento.getAttribute("aria-hidden") !== "true" &&
      // offsetParent nulo = escondido por display:none ou por um ancestral.
      (elemento.offsetParent !== null || elemento === atual),
  );
  const indice = todos.indexOf(atual);
  return indice === -1 ? null : (todos[indice + 1] ?? null);
}

type CampoComExemploProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange" | "placeholder"
> & {
  /** Rotulo visivel acima do campo. */
  rotulo: string;
  /** Valor controlado. String vazia = campo vazio (o Tab age nesse caso). */
  valor: string;
  /** Recebe o novo valor ja' extraido do evento. */
  aoMudar: (valor: string) => void;
  /**
   * Texto de exemplo. Aparece como placeholder E e' o que a tecla Tab
   * preenche quando o campo esta vazio. String vazia desliga as duas coisas.
   */
  exemplo?: string;
  /** Dica curta abaixo do campo (opcional). */
  dica?: string;
};

/**
 * Campo de formulario onde Tab completa o texto de exemplo.
 *
 * Com o campo VAZIO, Tab preenche o valor do `exemplo` e segue o foco pro
 * proximo campo normalmente. Com o campo ja' preenchido, Tab so' navega — o
 * comportamento padrao, intocado.
 *
 * O foco NUNCA e' retido: prender o Tab pra "aproveitar" a tecla criaria uma
 * armadilha de teclado (WCAG 2.1.2, "No Keyboard Trap") e deixaria quem navega
 * sem mouse — ou com leitor de tela — preso no campo. Por isso o valor e'
 * preenchido e o evento segue seu caminho.
 *
 * Shift+Tab e Tab com modificador ficam de fora: quem volta pro campo anterior
 * esta corrigindo o formulario, nao pedindo exemplo, e preencher ali seria um
 * efeito colateral surpreendente.
 */
export const CampoComExemplo = forwardRef<HTMLInputElement, CampoComExemploProps>(
  function CampoComExemplo(
    { rotulo, valor, aoMudar, exemplo, dica, onKeyDown, className, ...resto },
    ref,
  ) {
    const idDica = useId();
    const preenchivel = Boolean(exemplo) && valor === "";

    function aoTeclar(evento: React.KeyboardEvent<HTMLInputElement>) {
      // Quem chamou pode ter seu proprio handler; ele roda primeiro e pode
      // cancelar o nosso com preventDefault().
      onKeyDown?.(evento);
      if (evento.defaultPrevented) return;

      if (
        evento.key !== "Tab" ||
        evento.shiftKey ||
        evento.altKey ||
        evento.ctrlKey ||
        evento.metaKey ||
        !preenchivel ||
        !exemplo
      ) {
        return;
      }

      aoMudar(exemplo);

      // `input[type=time]` e' composto por secoes internas (hora, minuto e, em
      // alguns locales, AM/PM), e o Tab nativo anda de uma secao pra outra
      // ANTES de sair do campo. Como acabamos de preencher todas elas, o
      // usuario apertaria Tab tres vezes achando que o foco travou. Nos outros
      // tipos o Tab nativo ja' vai pro proximo campo, e mexer nele seria pior.
      if (evento.currentTarget.type === "time") {
        const proximo = proximoTabulavel(evento.currentTarget);
        if (proximo) {
          evento.preventDefault();
          proximo.focus();
        }
      }
    }

    return (
      <label className="flex flex-col gap-1.5">
        <span className="text-text-muted text-xs font-semibold">{rotulo}</span>
        <input
          ref={ref}
          value={valor}
          onChange={(evento) => aoMudar(evento.target.value)}
          onKeyDown={aoTeclar}
          placeholder={exemplo}
          // Anuncia o atalho a quem usa leitor de tela: sem isso o recurso
          // existe mas e' invisivel pra quem mais depende do teclado.
          aria-describedby={dica || preenchivel ? idDica : undefined}
          // `className` de quem chama SOMA ao padrao em vez de substituir:
          // trocar a string inteira so' pra acrescentar um modificador
          // (read-only:opacity-60, por exemplo) derrubaria o estilo base do
          // campo em silencio.
          className={`text-text w-full rounded-lg bg-transparent px-3 py-2 text-sm outline-none${
            className ? ` ${className}` : ""
          }`}
          style={{ border: "1px solid var(--border)" }}
          {...resto}
        />
        {(dica || preenchivel) && (
          <span id={idDica} className="text-text-muted text-[11px]">
            {dica ?? `Tab preenche com "${exemplo}".`}
          </span>
        )}
      </label>
    );
  },
);
