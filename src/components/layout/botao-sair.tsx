import { IconSair } from "@/components/ui/icons";

type BotaoSairProps = {
  /**
   * Classes de COR (texto e hover) de quem usa. Cada sidebar tem seus
   * tokens — a v1 usa os de superficie, a v2 os --sidebar-v2-* —, entao o
   * botao so' define forma e tamanho e recebe a cor de fora.
   */
  className?: string;
};

/**
 * Botao de sair do cartao do professor, nas duas sidebars.
 *
 * Um <form method="post"> de verdade, nao um onClick com fetch: funciona sem
 * JavaScript, e o redirect 303 do /sair leva o navegador direto pro login
 * (um fetch seguiria o redirect por baixo e deixaria a tela parada). POST
 * porque GET de logout seria disparavel por qualquer link ou prefetch.
 *
 * So' icone, entao o nome acessivel vem do aria-label; o `title` da a dica
 * visual no hover pra quem usa mouse.
 */
export function BotaoSair({ className = "" }: BotaoSairProps) {
  return (
    <form method="post" action="/sair" className="flex-none">
      <button
        type="submit"
        aria-label="Sair da conta"
        title="Sair"
        className={`grid h-7 w-7 place-items-center rounded-lg transition-colors ${className}`}
      >
        <IconSair size={16} />
      </button>
    </form>
  );
}
