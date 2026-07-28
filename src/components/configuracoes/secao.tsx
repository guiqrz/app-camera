import type { ReactNode } from "react";

/**
 * Blocos de layout compartilhados pelas abas das Configuracoes.
 *
 * Existem pra que cada aba nao repita a mesma marcacao de cartao e de linha —
 * e pra que a separacao entre linhas seja decidida num lugar so'.
 */

type SecaoProps = {
  titulo: string;
  descricao?: string;
  children: ReactNode;
};

/** Cartao que agrupa configuracoes de um mesmo assunto. */
export function Secao({ titulo, descricao, children }: SecaoProps) {
  return (
    <section className="mb-4 rounded border border-border-default bg-surface px-4 pb-1 pt-4">
      <h2 className="m-0 font-display text-sm font-semibold text-text">
        {titulo}
      </h2>
      {descricao !== undefined && (
        <p className="mb-3.5 mt-0.5 text-xs text-text-muted">{descricao}</p>
      )}
      {/* A borda de separacao mora na propria Linha (:not(:first-child)), pra
          que qualquer conteudo extra entre linhas nao vire uma borda solta. */}
      <div className="[&>*+*]:border-t [&>*+*]:border-border-default">
        {children}
      </div>
    </section>
  );
}

type LinhaProps = {
  rotulo: string;
  /** Texto de apoio: explica a consequencia, nao repete o rotulo. */
  apoio?: string;
  /** O controle ou o valor, a direita. */
  children: ReactNode;
};

/** Uma configuracao: rotulo e apoio a esquerda, controle a direita. */
export function Linha({ rotulo, apoio, children }: LinhaProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3">
      <div className="min-w-0">
        <p className="m-0 text-sm font-medium text-text">{rotulo}</p>
        {apoio !== undefined && (
          <p className="mt-0.5 text-xs text-text-muted">{apoio}</p>
        )}
      </div>
      {children}
    </div>
  );
}

/** Valor so' de leitura, em fonte monoespacada (ids, enderecos, versoes). */
export function ValorFixo({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-sm bg-surface-2 px-2.5 py-1 font-mono text-xs text-text-body">
      {children}
    </span>
  );
}
