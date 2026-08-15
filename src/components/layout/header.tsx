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

  // ESTATICO, sem fundo e sem blur — igual ao `.topo` do prototipo
  // (`padding: 22px 45px 0`, gap 14px, sem borda).
  //
  // Era `sticky top-0 z-30` + a classe `bg-painel`. O `style` anulava so' a
  // COR, mas a classe e' o gancho de `[class*="bg-painel"]` (globals.css), que
  // aplica `--blur-painel` = blur(30px), o mais forte do sistema. O resultado
  // era uma placa de vidro fixa no topo que acompanhava a rolagem e, com o
  // `pb-4` do celular, cobria alto demais e cortava o alternador de tema.
  //
  // No prototipo o topo rola junto com a pagina: nao ha' o que embacar por
  // baixo, entao nao ha' blur nem fundo. O `pb-0` do desktop vira o padrao nos
  // dois tamanhos porque o `.miolo` logo abaixo ja' traz o proprio respiro.
  return (
    <header className="flex flex-wrap items-center gap-[14px] px-5 pt-4 lg:px-[45px] lg:pt-[22px]">
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

      {/* No computador o titulo assume os valores do prototipo (25px/600,
          -0.025em); no celular ele encolhe pra caber ao lado do menu.

          `letterSpacing` em em, nao no `tracking-[]` do Tailwind: o valor
          arbitrario resolve sobre outro tamanho base e sai errado. Em em ele
          acompanha o tamanho da fonte nos dois breakpoints. */}
      <h1
        className="text-text flex-1 text-lg leading-[1.5] font-semibold lg:text-[25px]"
        style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.025em" }}
      >
        {titulo}
      </h1>

      <div className="hidden flex-none items-center gap-2 lg:flex">
        {children}
      </div>

      {/* So' o alternador de tema. O cartao do professor saiu daqui e foi pro
          pe da sidebar, onde o prototipo o coloca — o topo de cada tela fica
          so' com o titulo e os controles dela. */}
      <div className="flex flex-none items-center gap-2">
        <ThemeToggle />
      </div>

      {/* No celular os controles descem para uma segunda linha. */}
      {children && (
        <div className="flex w-full flex-wrap items-center gap-2 lg:hidden">{children}</div>
      )}
    </header>
  );
}
