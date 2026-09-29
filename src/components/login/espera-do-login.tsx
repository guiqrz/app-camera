"use client";

import { useEffect, useState } from "react";

import { LogoCupcam } from "@/components/layout/logo-cupcam";
import { IconAlerta, IconRaio } from "@/components/ui/icons";

/**
 * Tela "Servidores ligando" do login (29/09/2026).
 *
 * O professor chega aqui logo depois de apertar "Entrar" no site Strix, sem
 * esperar a API acordar. Enquanto o cronometro corre, a tela chama
 * /entrar/tentar em sequencia (nunca em paralelo: duas tentativas ao mesmo
 * tempo contariam duas vezes no limite de senhas erradas do backend) ate'
 * a resposta deixar de ser "ligando".
 *
 * Diferente do AvisoServidorLigando dos `loading.tsx`, este usa JavaScript
 * pro cronometro: aqui a pagina e' um componente cliente inteiro, hidratado
 * desde o inicio, entao o timer roda de verdade (la' nao rodaria, ver o
 * comentario daquele componente).
 */

type Estado = "ligando" | "pronto" | "senha" | "bloqueado" | "expirou" | "erro";

/** Quanto o Render costuma levar pra acordar; so' dimensiona a barra e o texto. */
const ESPERA_ESPERADA_S = 60;
/** Pausa entre tentativas; a propria tentativa ja' espera ate' 25 s pela API. */
const INTERVALO_ENTRE_TENTATIVAS_MS = 2_000;

const FINAIS: Record<Exclude<Estado, "ligando" | "pronto">, { titulo: string; texto: string }> = {
  senha: {
    titulo: "Email ou senha incorretos",
    texto: "Confira os dados e tente de novo.",
  },
  bloqueado: {
    titulo: "Muitas tentativas",
    texto: "Por segurança, aguarde alguns minutos antes de tentar de novo.",
  },
  expirou: {
    titulo: "O tempo de espera acabou",
    texto: "O servidor demorou mais que o normal para ligar. Entre de novo — ele já deve estar pronto.",
  },
  erro: {
    titulo: "Não foi possível entrar agora",
    texto: "Tente de novo em instantes.",
  },
};

export function EsperaDoLogin() {
  const [estado, setEstado] = useState<Estado>("ligando");
  const [segundos, setSegundos] = useState(0);

  // Cronometro: conta o tempo desde que a tela abriu, e para quando o estado
  // deixa de ser "ligando".
  useEffect(() => {
    if (estado !== "ligando") return;
    const inicio = Date.now();
    const relogio = window.setInterval(() => {
      setSegundos(Math.floor((Date.now() - inicio) / 1000));
    }, 1000);
    return () => window.clearInterval(relogio);
  }, [estado]);

  // Laco de tentativas. `ativo` impede que uma resposta chegando depois da
  // desmontagem (ou do StrictMode em dev) mexa no estado.
  useEffect(() => {
    let ativo = true;

    const tentar = async () => {
      while (ativo) {
        let proximo: Estado = "ligando";
        try {
          const resposta = await fetch("/entrar/tentar", { method: "POST", cache: "no-store" });
          const dados = (await resposta.json().catch(() => null)) as { estado?: Estado } | null;
          proximo = dados?.estado ?? "erro";
        } catch {
          // Rede do proprio professor oscilou: continua tentando, os cookies
          // do login ainda valem ate' o prazo deles.
          proximo = "ligando";
        }
        if (!ativo) return;
        if (proximo === "pronto") {
          setEstado("pronto");
          // replace: "voltar" no navegador nao deve cair de novo na espera.
          window.location.replace("/");
          return;
        }
        if (proximo !== "ligando") {
          setEstado(proximo);
          return;
        }
        await new Promise((resolver) => setTimeout(resolver, INTERVALO_ENTRE_TENTATIVAS_MS));
      }
    };

    void tentar();
    return () => {
      ativo = false;
    };
  }, []);

  const final = estado !== "ligando" && estado !== "pronto" ? FINAIS[estado] : null;
  const demorando = segundos >= ESPERA_ESPERADA_S;
  // A barra enche nos 60 s esperados e para em 95%: cheia de verdade so'
  // quando o login sai (a tela ja' esta indo embora nesse momento).
  const progresso = estado === "pronto" ? 100 : Math.min(95, (segundos / ESPERA_ESPERADA_S) * 100);

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="text-text mb-6 flex items-center justify-center gap-2.5">
          <LogoCupcam size={26} />
          <span className="text-lg font-semibold tracking-tight">Cupcam</span>
        </div>

        {final === null ? (
          <section
            className="aviso-servidor-cartao border-warn text-warn-fg rounded-2xl border p-6 shadow-lg sm:p-7"
            aria-labelledby="espera-titulo"
          >
            <div className="flex items-start gap-4">
              <span
                className="bg-warn/15 flex size-11 shrink-0 items-center justify-center rounded-xl motion-safe:animate-pulse"
                aria-hidden="true"
              >
                <IconRaio size={22} />
              </span>
              <div className="min-w-0 flex-1" role="status" aria-live="polite">
                <h1 id="espera-titulo" className="text-lg font-semibold">
                  {estado === "pronto" ? "Tudo pronto, entrando…" : "Servidores ligando"}
                </h1>
                <p className="mt-1 text-sm leading-relaxed">
                  {estado === "pronto"
                    ? "Abrindo o app."
                    : demorando
                      ? "Está demorando mais que o normal. Seguimos tentando, não feche a página."
                      : "Aguarde alguns segundos — costuma levar até 1 minuto. Você entra sozinho quando estiver pronto."}
                </p>
              </div>
            </div>

            <div className="mt-6 flex items-center gap-4" aria-hidden="true">
              <div className="bg-warn/20 h-2 flex-1 overflow-hidden rounded-full">
                <div
                  className="bg-warn h-full rounded-full transition-[width] duration-1000 ease-linear"
                  style={{ width: `${progresso}%` }}
                />
              </div>
              <span className="font-mono text-2xl font-semibold tabular-nums">
                {formatarTempo(segundos)}
              </span>
            </div>
          </section>
        ) : (
          <section
            className="border-border-default bg-surface rounded-2xl border p-6 shadow-lg sm:p-7"
            aria-labelledby="espera-titulo"
          >
            <div className="flex items-start gap-4" role="alert">
              <span
                className="flex size-11 shrink-0 items-center justify-center rounded-xl"
                style={{ background: "var(--danger-bg)", color: "var(--danger-fg)" }}
                aria-hidden="true"
              >
                <IconAlerta size={22} />
              </span>
              <div className="min-w-0 flex-1">
                <h1 id="espera-titulo" className="text-text text-lg font-semibold">
                  {final.titulo}
                </h1>
                <p className="text-text-body mt-1 text-sm leading-relaxed">{final.texto}</p>
              </div>
            </div>
            {/* /entrar/iniciar gera um state novo: o antigo ja' foi descartado. */}
            <a
              href="/entrar/iniciar"
              className="text-text-on-brand mt-6 flex w-full items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2"
              style={{ background: "var(--primary)" }}
            >
              Voltar ao login
            </a>
          </section>
        )}
      </div>
    </main>
  );
}

/** 83 -> "1:23". */
function formatarTempo(total: number): string {
  const minutos = Math.floor(total / 60);
  const segundos = total % 60;
  return `${minutos}:${String(segundos).padStart(2, "0")}`;
}
