"use client";

/**
 * Tela de falha reutilizavel para qualquer pagina que dependa da API.
 *
 * A causa mais comum nao e' um defeito do site, e sim a API fora do ar
 * (notebook desligado, tunel caido, chave errada). A mensagem explica isso em
 * linguagem comum, em vez de exibir a excecao crua.
 */
export function EstadoErroApi({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  const pareceApiForaDoAr =
    error.message.includes("Nao foi possivel falar com a API") ||
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

      <h1 className="text-text text-xl font-extrabold">
        {pareceApiForaDoAr
          ? "Não foi possível falar com o CUPCAM"
          : "Algo deu errado"}
      </h1>

      {pareceApiForaDoAr ? (
        <div className="text-text-body flex flex-col gap-3 text-sm leading-relaxed">
          <p>O site não conseguiu alcançar o sistema que fica na escola. Verifique:</p>
          <ul className="text-text-muted mx-auto w-fit list-disc space-y-1 pl-5 text-left">
            <li>o notebook da sala está ligado;</li>
            <li>a API do CUPCAM está rodando;</li>
            <li>o túnel (cloudflared) continua aberto.</li>
          </ul>
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
        className="rounded-xl px-6 py-3 text-sm font-extrabold text-white transition-opacity hover:opacity-90"
        style={{ background: "var(--primary)" }}
      >
        Tentar novamente
      </button>
    </main>
  );
}
