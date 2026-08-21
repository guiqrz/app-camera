"use client";

/**
 * Tela de falha reutilizavel para qualquer pagina que dependa da API da NUVEM.
 *
 * A causa mais comum nao e' um defeito do site, e sim a API fora do ar. Desde
 * 20/08/2026 isso mudou de significado: a API saiu do notebook e foi pra nuvem,
 * entao "fora do ar" aqui e' o servico hospedado, e nao mais a maquina da
 * escola. O plano gratuito hiberna depois de 15 min sem uso, e a primeira visita
 * do dia acorda o servico em 30-60s — que e' de longe o caso mais provavel de
 * quem chega nesta tela.
 *
 * A tela de Camera NAO usa esta: la', o que cai e' o computador da sala, e a
 * mensagem certa e' outra (ver VistaDesconectada em components/camera).
 */
export function EstadoErroApi({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  // Casa com o prefixo das duas mensagens de rede de lib/api.ts ("...com a API
  // do CUPCAM na nuvem" e "...com o computador da sala"), sem depender do texto
  // completo de nenhuma delas.
  const pareceApiForaDoAr =
    error.message.includes("Nao foi possivel falar com") ||
    error.message.includes("fetch failed");

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-5 px-6 text-center">
      <div
        className="flex h-14 w-14 items-center justify-center rounded-full"
        style={{ background: "var(--danger-bg)" }}
        aria-hidden
      >
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 2 1 21h22L12 2Z"
            stroke="var(--danger-fg)"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <path
            d="M12 9v5M12 17.5v.1"
            stroke="var(--danger-fg)"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      </div>

      <h1 className="text-text text-xl font-semibold">
        {pareceApiForaDoAr
          ? "Não foi possível falar com o CUPCAM"
          : "Algo deu errado"}
      </h1>

      {pareceApiForaDoAr ? (
        <div className="text-text-body flex flex-col gap-3 text-sm leading-relaxed">
          <p>
            O site não conseguiu alcançar o servidor do CUPCAM. Na maioria das
            vezes ele está apenas <strong>acordando</strong>: o serviço hiberna
            depois de 15 minutos sem uso, e a primeira visita do dia leva de 30 a
            60 segundos.
          </p>
          <p className="text-text-muted text-xs">
            Espere alguns segundos e tente de novo. Se continuar assim depois de
            duas tentativas, o servidor pode estar fora do ar.
          </p>
        </div>
      ) : (
        <p className="text-text-body text-sm leading-relaxed">
          Tente novamente. Se o problema continuar, verifique se a API do CUPCAM
          está respondendo.
        </p>
      )}

      <button
        type="button"
        onClick={reset}
        className="rounded-xl px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        style={{ background: "var(--primary)" }}
      >
        Tentar novamente
      </button>
    </main>
  );
}
