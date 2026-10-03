"use client";

import { useState } from "react";

import { IconOlho, IconOlhoRiscado } from "@/components/ui/icons";

type CampoSenhaProps = {
  id: string;
  rotulo: string;
  valor: string;
  aoMudar: (valor: string) => void;
  invalido?: boolean;
  /** id da mensagem de erro, ligada por aria-describedby quando invalido. */
  descritoPor?: string;
  autoFocus?: boolean;
};

/**
 * Campo de senha do site Strix: sublinhado, com o olho de mostrar/esconder
 * dentro (mesmo comportamento do script.js de la': troca o tipo do input e o
 * desenho do olho). Senha nova sempre: autocomplete "new-password".
 */
export function CampoSenha({
  id,
  rotulo,
  valor,
  aoMudar,
  invalido = false,
  descritoPor,
  autoFocus = false,
}: CampoSenhaProps) {
  const [visivel, setVisivel] = useState(false);

  return (
    <div className="campo">
      <label htmlFor={id}>{rotulo}</label>
      <div className="campo-senha">
        <input
          type={visivel ? "text" : "password"}
          id={id}
          name={id}
          autoComplete="new-password"
          placeholder="••••••••"
          value={valor}
          onChange={(evento) => aoMudar(evento.target.value)}
          aria-invalid={invalido || undefined}
          aria-describedby={invalido ? descritoPor : undefined}
          autoFocus={autoFocus}
        />
        <button
          type="button"
          className="mostrar-senha"
          aria-label={visivel ? "Esconder senha" : "Mostrar senha"}
          aria-pressed={visivel}
          onClick={() => setVisivel((atual) => !atual)}
        >
          {visivel ? <IconOlhoRiscado /> : <IconOlho />}
        </button>
      </div>
    </div>
  );
}
