"use client";

import { useEffect, useId, useRef, useState } from "react";

import { IconInterrogacao } from "@/components/ui/icons";

type DicaAjudaProps = {
  /** Texto do balao. Uma explicacao, nao um rotulo — cabe alguns paragrafos. */
  texto: string;
  /**
   * Rotulo do botao pra leitor de tela. Sempre diga DE QUE e' a ajuda: com tres
   * "?" na mesma faixa, "Saiba mais" tres vezes nao distingue nada.
   */
  rotulo: string;
  /** Lado em que o balao abre. `direita` evita cortar na borda da tela. */
  lado?: "esquerda" | "direita";
  className?: string;
};

/**
 * Botao "?" com balao de ajuda.
 *
 * Abre no hover (mouse), no clique (toque) e no foco (teclado). Os tres juntos
 * sao obrigatorios, nao redundancia: hover puro deixaria o texto inacessivel no
 * celular — e a tela de Camera e' usada em pe', na sala — e tambem pra quem
 * navega por teclado. Fecha com Esc ou clique fora (WCAG 1.4.13).
 *
 * O texto e' SEMPRE renderizado, so' escondido com `hidden`, pra ser encontravel
 * pelo Ctrl+F do navegador e anunciado pelo `aria-describedby` mesmo fechado.
 *
 * Nao usa `title=""` nativo: atrasa ~1s, some sozinho, nao aparece no toque e
 * nao da' pra estilizar.
 */
export function DicaAjuda({ texto, rotulo, lado = "direita", className }: DicaAjudaProps) {
  const [aberto, setAberto] = useState(false);
  const idBalao = useId();
  const container = useRef<HTMLSpanElement>(null);

  // Esc e clique fora so' importam com o balao aberto — sem isso seriam dois
  // listeners globais por "?" na tela, sempre ligados.
  useEffect(() => {
    if (!aberto) return;

    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === "Escape") setAberto(false);
    }

    function aoApontar(evento: PointerEvent) {
      if (!container.current?.contains(evento.target as Node)) setAberto(false);
    }

    document.addEventListener("keydown", aoTeclar);
    document.addEventListener("pointerdown", aoApontar);
    return () => {
      document.removeEventListener("keydown", aoTeclar);
      document.removeEventListener("pointerdown", aoApontar);
    };
  }, [aberto]);

  return (
    // `inline-flex` sem `relative`: o balao se ancora no BOTAO (que e' relative),
    // nao neste wrapper — assim quem chama pode posicionar o "?" com `absolute`
    // pelo `className` sem que as duas classes briguem. Tailwind nao resolve
    // conflito de `position`: quem vence e' a ordem no CSS, nao a ordem aqui.
    <span ref={container} className={`inline-flex ${className ?? ""}`}>
      <button
        type="button"
        aria-label={rotulo}
        aria-expanded={aberto}
        aria-describedby={idBalao}
        onClick={(evento) => {
          // O "?" costuma ficar DENTRO de um cartao clicavel (o proprio botao de
          // modo): sem isto, pedir ajuda trocaria o modo junto.
          evento.preventDefault();
          evento.stopPropagation();
          setAberto((estava) => !estava);
        }}
        onPointerEnter={() => setAberto(true)}
        onPointerLeave={() => setAberto(false)}
        onFocus={() => setAberto(true)}
        onBlur={() => setAberto(false)}
        className="text-text-muted hover:text-text focus-visible:ring-primary relative flex h-6 w-6 items-center justify-center rounded-full transition-colors focus-visible:ring-2 focus-visible:outline-none"
        // Alvo de toque de 44px por area invisivel, sem esticar o desenho: o
        // botao visivel tem 24px. Mesma regra do resto do app.
        style={{ touchAction: "manipulation" }}
      >
        <span aria-hidden className="absolute -inset-2.5" />
        <IconInterrogacao size={16} />
      </button>

      <span
        id={idBalao}
        role="tooltip"
        hidden={!aberto}
        className={`absolute bottom-full z-20 mb-2 w-60 rounded-xl border p-3 text-xs leading-relaxed shadow-lg ${
          lado === "direita" ? "right-0" : "left-0"
        }`}
        style={{
          borderColor: "var(--border)",
          background: "var(--surface)",
          color: "var(--text)",
        }}
      >
        {texto}
      </span>
    </span>
  );
}
