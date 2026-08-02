"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, type ComponentType } from "react";

import { LogoCupcam } from "@/components/layout/logo-cupcam";
import {
  IconAdministracao,
  IconAulas,
  IconCamera,
  IconChamada,
  IconConfiguracoes,
  IconFechar,
  IconRelatorios,
} from "@/components/ui/icons";

type ItemMenu = {
  rotulo: string;
  href: string;
  Icone: ComponentType<{ size?: number; className?: string }>;
  /** Tela ainda nao construida: aparece apagada e nao navega. */
  emBreve?: boolean;
};

/**
 * A marca do CUPCAM como icone do item do assistente.
 *
 * Em SVG de cor unica (`currentColor`), entao acompanha a cor do item — que
 * muda quando ele esta ativo e entre os temas claro/escuro.
 */
function IconeCupAI({ size = 19 }: { size?: number }) {
  return <LogoCupcam size={size} />;
}

const ITENS: ItemMenu[] = [
  { rotulo: "Minhas Aulas", href: "/aulas", Icone: IconAulas },
  { rotulo: "Chamada", href: "/chamada", Icone: IconChamada },
  { rotulo: "Relatórios", href: "/relatorios", Icone: IconRelatorios },
  { rotulo: "Câmera", href: "/camera", Icone: IconCamera },
  { rotulo: "Cup AI", href: "/ia", Icone: IconeCupAI },
  { rotulo: "Coordenação", href: "/coordenacao", Icone: IconAdministracao },
  { rotulo: "Configurações", href: "/configuracoes", Icone: IconConfiguracoes },
];

function Logo() {
  return (
    // `px-2` alinha a BORDA da logo (36px) com a dos icones do menu (18px em
    // `px-3.5`): a diferenca de meio icone e' compensada no padding, senao a
    // marca fica recuada em relacao aos itens logo abaixo.
    <div className="flex items-center gap-2 px-2">
      {/* O PNG ja vem recortado e quadrado (public/logo-cupcam.png, 144px),
          servido a 36 pra ficar nitido em tela retina. `priority` porque o
          logo aparece acima da dobra em toda pagina — sem isso ele entra
          depois do primeiro desenho e o menu "pisca" sem marca. */}
      <Image
        src="/logo-cupcam.png"
        alt=""
        width={36}
        height={36}
        priority
        className="h-9 w-9 flex-none"
        aria-hidden
      />
      <span
        className="text-lg font-bold"
        style={{
          fontFamily: "var(--font-geologica)",
          color: "var(--sidebar-text-active)",
        }}
      >
        Cupcam Insights
      </span>
    </div>
  );
}

type SidebarProps = {
  /** No celular o menu vira gaveta; no computador fica sempre visivel. */
  aberto: boolean;
  aoFechar: () => void;
};

export function Sidebar({ aberto, aoFechar }: SidebarProps) {
  const caminho = usePathname();

  // Esc fecha a gaveta — o atalho que todo mundo espera de um painel sobreposto.
  useEffect(() => {
    if (!aberto) return;

    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") aoFechar();
    };

    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [aberto, aoFechar]);

  // Trava a rolagem do fundo enquanto a gaveta esta aberta.
  useEffect(() => {
    if (!aberto) return;

    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = anterior;
    };
  }, [aberto]);

  return (
    <>
      {/* Escurece o conteudo atras da gaveta (so' no celular). */}
      {aberto && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={aoFechar}
          aria-hidden
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[270px] flex-col gap-8 px-5 py-7 transition-transform duration-200 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${
          aberto ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ background: "var(--sidebar-bg)" }}
        aria-label="Menu principal"
      >
        <div className="flex items-center justify-between">
          <Logo />
          {/* p-3 (nao p-1): media 26px, abaixo do piso de 44px para o dedo. */}
          <button
            type="button"
            onClick={aoFechar}
            className="-m-1 rounded-lg p-3 lg:hidden"
            style={{ color: "var(--sidebar-text)" }}
            aria-label="Fechar menu"
          >
            <IconFechar />
          </button>
        </div>

        <nav className="flex flex-col gap-1">
          {ITENS.map(({ rotulo, href, Icone, emBreve }) => {
            const ativo = caminho.startsWith(href);

            const conteudo = (
              <>
                <Icone />
                <span className="flex-1">{rotulo}</span>
                {emBreve && (
                  <span className="text-[10px] font-bold tracking-wide uppercase opacity-60">
                    em breve
                  </span>
                )}
              </>
            );

            const classes =
              "flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm transition-colors";

            // Item de tela nao construida: nao navega e some da ordem de
            // tabulacao, em vez de levar o professor a uma pagina vazia.
            if (emBreve) {
              return (
                <span
                  key={href}
                  className={`${classes} cursor-not-allowed font-semibold opacity-50`}
                  style={{ color: "var(--sidebar-text)" }}
                  aria-disabled
                >
                  {conteudo}
                </span>
              );
            }

            return (
              <Link
                key={href}
                href={href}
                onClick={aoFechar}
                aria-current={ativo ? "page" : undefined}
                className={`${classes} ${ativo ? "font-extrabold shadow-sm" : "font-semibold"}`}
                style={{
                  background: ativo ? "var(--sidebar-item-active)" : "transparent",
                  color: ativo ? "var(--sidebar-text-active)" : "var(--sidebar-text)",
                }}
              >
                {conteudo}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
