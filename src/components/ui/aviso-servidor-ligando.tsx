import { IconRaio } from "@/components/ui/icons";

/**
 * Aviso "Servidor ligando" pros esqueletos de carregamento (`loading.tsx`).
 *
 * POR QUE EXISTE (27/09/2026): a API roda no plano gratuito do Render, que
 * hiberna quando ninguem usa e leva 30-60 s pra acordar. Nesse tempo o
 * professor so' via o esqueleto pulsando — parecia travado, e a reacao
 * natural era fechar a pagina bem quando o servidor estava quase pronto.
 *
 * POR QUE SO' CSS, SEM NENHUM JAVASCRIPT: no carregamento de pagina inteira
 * (o professor abrindo o app no dia seguinte, o caso mais comum), o servidor
 * manda o esqueleto antes dos dados, e o React NAO hidrata o conteudo de um
 * Suspense que ainda esta' esperando — o esqueleto fica como HTML parado. Um
 * timer com useEffect nunca rodaria justo ali (medido: 8 s de esqueleto, zero
 * aviso). Animacao CSS roda em HTML parado, entao tudo aqui e' CSS: o atraso
 * de 3 s, a barra, o contador e a troca de texto aos 60 s. As regras moram em
 * globals.css, bloco "Aviso Servidor ligando".
 *
 * Vive DENTRO do loading.tsx de proposito: quando os dados chegam o Next troca
 * o esqueleto pela tela real e o aviso some junto, sem estado dizendo "acabou".
 * Todos os relogios comecam quando o elemento entra na pagina, que e' quando
 * a espera comeca pra quem esta olhando.
 */
export function AvisoServidorLigando() {
  return (
    <div className="aviso-servidor-ligando" role="status">
      <div className="aviso-servidor-cartao border-warn text-warn-fg flex items-start gap-3 rounded-2xl border p-4 shadow-lg sm:p-5">
        <span
          className="bg-warn/15 mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl"
          aria-hidden="true"
        >
          <IconRaio size={20} />
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-base font-semibold">Servidor ligando</p>
          {/* Os dois textos ocupam a mesma celula do grid; o CSS troca um pelo
              outro aos 60 s. Sem JavaScript nao da' pra trocar o texto. O
              segundo fica fora do leitor de tela: o texto que sai so' perde a
              opacidade (ver globals.css), entao o leitor leria os dois. */}
          <p className="aviso-servidor-textos grid text-sm">
            <span className="aviso-servidor-texto-normal">
              Aguarde de 30 a 60 segundos, não feche a página.
            </span>
            <span className="aviso-servidor-texto-demorando" aria-hidden="true">
              Está demorando mais que o normal. Seguimos tentando, não feche a página.
            </span>
          </p>

          <div className="mt-3 flex items-center gap-3" aria-hidden="true">
            <div className="bg-warn/20 h-2 flex-1 overflow-hidden rounded-full">
              <div className="aviso-servidor-barra bg-warn h-full rounded-full" />
            </div>
            <span className="aviso-servidor-contador font-mono text-sm tabular-nums" />
          </div>
        </div>
      </div>
    </div>
  );
}
