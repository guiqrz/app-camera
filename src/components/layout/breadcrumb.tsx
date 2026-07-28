import Link from "next/link";

import { IconSetaDireita } from "@/components/ui/icons";

export type EloBreadcrumb = {
  rotulo: string;
  /** Sem `href` o elo e' a pagina atual: vira texto, nao link. */
  href?: string;
};

type BreadcrumbProps = {
  elos: EloBreadcrumb[];
};

/**
 * Trilha de navegacao das telas profundas.
 *
 * Existe porque o titulo do cabecalho e' `lg:hidden`: no computador — onde o
 * professor passa a maior parte do tempo — o unico indicador de posicao era o
 * item destacado no menu lateral, que diz a secao ("Relatorios") mas nao de
 * qual turma nem de qual aula.
 *
 * O ultimo elo e' a pagina atual e nao navega, seguindo a convencao de trilha:
 * um link para onde ja se esta so' engana quem usa leitor de tela.
 */
export function Breadcrumb({ elos }: BreadcrumbProps) {
  if (elos.length === 0) return null;

  return (
    <nav aria-label="Trilha de navegação">
      <ol className="text-text-muted flex flex-wrap items-center gap-1.5 text-xs font-semibold">
        {elos.map((elo, indice) => {
          const ultimo = indice === elos.length - 1;

          return (
            <li key={`${elo.rotulo}-${indice}`} className="flex items-center gap-1.5">
              {indice > 0 && (
                <span className="opacity-50" aria-hidden>
                  <IconSetaDireita size={12} />
                </span>
              )}

              {elo.href && !ultimo ? (
                <Link
                  href={elo.href}
                  className="hover:text-text-brand rounded transition-colors"
                >
                  {elo.rotulo}
                </Link>
              ) : (
                <span
                  className={ultimo ? "text-text font-extrabold" : undefined}
                  // A pagina atual, anunciada como tal em vez de so' parecer
                  // diferente visualmente.
                  aria-current={ultimo ? "page" : undefined}
                >
                  {elo.rotulo}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
