"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, type ComponentType } from "react";

import {
  IconAdministracao,
  IconAulas,
  IconChamada,
  IconConfiguracoes,
  IconFechar,
  IconIA,
  IconRelatorios,
} from "@/components/ui/icons";

type ItemMenu = {
  rotulo: string;
  href: string;
  Icone: ComponentType<{ size?: number; className?: string }>;
  /** Tela ainda nao construida: aparece apagada e nao navega. */
  emBreve?: boolean;
};

const ITENS: ItemMenu[] = [
  { rotulo: "Minhas Aulas", href: "/aulas", Icone: IconAulas },
  { rotulo: "Chamada", href: "/chamada", Icone: IconChamada },
  { rotulo: "Relatórios", href: "/relatorios", Icone: IconRelatorios },
  { rotulo: "Inteligência Artificial", href: "/ia", Icone: IconIA, emBreve: true },
  { rotulo: "Administração", href: "/administracao", Icone: IconAdministracao },
  { rotulo: "Configurações", href: "/configuracoes", Icone: IconConfiguracoes, emBreve: true },
];

function Logo() {
  return (
    <div className="flex items-center gap-2.5 px-2">
      <div
        className="h-9 w-9 flex-none rounded-full"
        style={{ background: "var(--grad-brand)" }}
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
          <button
            type="button"
            onClick={aoFechar}
            className="rounded-lg p-1 lg:hidden"
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
