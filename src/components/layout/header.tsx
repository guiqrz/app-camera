"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { ThemeToggle } from "@/components/theme/theme-toggle";
import { IconMenu, IconSetaEsquerda } from "@/components/ui/icons";

type HeaderProps = {
  aoAbrirMenu: () => void;
  /** Titulo curto exibido no celular, onde nao ha menu lateral visivel. */
  titulo: string;
  /** Controles da tela (seletor de turma, busca) exibidos no computador. */
  children?: React.ReactNode;
};

export function Header({ aoAbrirMenu, titulo, children }: HeaderProps) {
  const router = useRouter();
  // So' aparece quando ha pra onde voltar DENTRO da navegacao desta aba.
  // `history.length > 1` e' a unica leitura disponivel (o historico em si e'
  // opaco por seguranca): com 1, esta pagina foi a primeira, e um `back()` ali
  // jogaria o professor pra fora do app — pior que nao ter o botao.
  //
  // Depois da montagem, nao no render: `history` nao existe no servidor, e ler
  // no primeiro render do cliente daria hidratacao divergente. O setTimeout(0)
  // e' o mesmo padrao do localStorage em painel-privacidade.tsx e
  // vista-camera.tsx — o lint le' o setState sincrono como recalculo derivavel,
  // mas isto e' leitura de sistema externo.
  const [podeVoltar, setPodeVoltar] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setPodeVoltar(window.history.length > 1), 0);
    return () => clearTimeout(id);
  }, []);

  return (
    <header className="bg-surface shadow-header sticky top-0 z-30 flex flex-wrap items-center gap-4 px-5 py-4 lg:px-10">
      {/* p-3 (nao p-1): e' o alvo mais tocado do celular e media 26px. */}
      <button
        type="button"
        onClick={aoAbrirMenu}
        className="text-text -m-1 flex-none rounded-lg p-3 lg:hidden"
        aria-label="Abrir menu"
      >
        <IconMenu />
      </button>

      {podeVoltar && (
        <button
          type="button"
          onClick={() => router.back()}
          className="text-text hover:bg-surface-2 focus-visible:ring-primary -m-1 flex-none rounded-lg p-2.5 transition-colors focus-visible:ring-2 focus-visible:outline-none"
          aria-label="Voltar para a página anterior"
          title="Voltar"
        >
          <IconSetaEsquerda size={18} />
        </button>
      )}

      <span
        className="text-text flex-1 text-lg font-extrabold lg:hidden"
        style={{ fontFamily: "var(--font-geologica)" }}
      >
        {titulo}
      </span>

      <div className="hidden flex-1 items-center gap-3 lg:flex">{children}</div>

      <div className="flex flex-none items-center gap-3">
        <ThemeToggle />

        {/* Sem cadastro de professor no banco: dado fixo por ora. */}
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-10 w-10 flex-none items-center justify-center rounded-full text-sm font-extrabold text-white"
            style={{ background: "var(--violet-800)" }}
            aria-hidden
          >
            PM
          </div>
          <div className="hidden sm:block">
            <div className="text-text text-sm font-extrabold">Prof. Monteiro</div>
            <div className="text-text-muted text-xs">Biologia Avançada</div>
          </div>
        </div>
      </div>

      {/* No celular os controles descem para uma segunda linha. */}
      {children && (
        <div className="flex w-full flex-wrap items-center gap-2 lg:hidden">{children}</div>
      )}
    </header>
  );
}
