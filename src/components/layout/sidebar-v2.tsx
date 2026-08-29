"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ComponentType } from "react";

import { LogoCupcam } from "@/components/layout/logo-cupcam";
import {
  IconAdministracao,
  IconAulas,
  IconCamera,
  IconChamada,
  IconConfiguracoes,
  IconFechar,
  IconRecolherMenu,
  IconRelatorios,
} from "@/components/ui/icons";

/**
 * NOVA VERSAO da sidebar (29/08/2026), baseada numa referencia visual de
 * "painel flutuante em vidro" (download (15).jpeg). Mesma funcionalidade da
 * v1 (`sidebar.tsx`) — recolher, gaveta no celular, teclado, ARIA — trocando
 * so' a APRESENTACAO: painel destacado do fundo (nao colado na borda),
 * cabecalho com avatar + saudacao em duas linhas, rotulo de grupo com
 * CONTADOR, pilula do item ativo totalmente arredondada, o grupo "Apoio"
 * dentro de um cartao branco e um botao circular de acao no rodape.
 *
 * Fica como ARQUIVO A PARTE de proposito: pra trocar de v1 pra v2 basta
 * mudar o import em app-shell.tsx — a v1 continua intacta como volta
 * possivel. Ver a nota dos tokens --sidebar-v2-* em semantic.css.
 */

const CHAVE_RECOLHIDA = "cupcam:sidebar-recolhida";

type ItemMenu = {
  rotulo: string;
  href: string;
  Icone: ComponentType<{ size?: number; className?: string }>;
};

/** Os mesmos dois grupos e os mesmos itens da v1 — so' o rotulo de grupo
    ganha o contador ("Sala de aula · 4", "Apoio · 3") pedido na referencia. */
const GRUPOS: { rotulo: string; itens: ItemMenu[] }[] = [
  {
    rotulo: "Sala de aula",
    itens: [
      { rotulo: "Minhas aulas", href: "/aulas", Icone: IconAulas },
      { rotulo: "Chamada", href: "/chamada", Icone: IconChamada },
      { rotulo: "Relatórios", href: "/relatorios", Icone: IconRelatorios },
      { rotulo: "Câmera", href: "/camera", Icone: IconCamera },
    ],
  },
  {
    rotulo: "Apoio",
    itens: [
      { rotulo: "Cup AI", href: "/ia", Icone: LogoCupcam },
      { rotulo: "Coordenação", href: "/coordenacao", Icone: IconAdministracao },
      {
        rotulo: "Configurações",
        href: "/configuracoes",
        Icone: IconConfiguracoes,
      },
    ],
  },
];

type SidebarProps = {
  /** No celular o menu vira gaveta; no computador fica sempre visivel. */
  aberto: boolean;
  aoFechar: () => void;
};

export function SidebarV2({ aberto, aoFechar }: SidebarProps) {
  const caminho = usePathname();

  // Mesma logica de recolhimento da v1: 62px, persistida no MESMO
  // localStorage (`CHAVE_RECOLHIDA`) — trocar de v1 pra v2 nao perde a
  // preferencia que o professor ja tinha escolhido.
  const [recolhida, setRecolhida] = useState(false);

  useEffect(() => {
    const id = setTimeout(
      () => setRecolhida(localStorage.getItem(CHAVE_RECOLHIDA) === "sim"),
      0,
    );
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("sidebar-recolhida", recolhida);
  }, [recolhida]);

  const alternarRecolhida = () => {
    setRecolhida((valor) => {
      const proximo = !valor;
      localStorage.setItem(CHAVE_RECOLHIDA, proximo ? "sim" : "nao");
      return proximo;
    });
  };

  useEffect(() => {
    if (!aberto) return;

    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") aoFechar();
    };

    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [aberto, aoFechar]);

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
      {aberto && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={aoFechar}
          aria-hidden
        />
      )}

      {/* O painel FLUTUA: `inset-y-3 left-3` (em vez de colar em inset-y-0
          left-0 como a v1) destaca a coluna do fundo, igual a referencia.
          `lg:ml-3 lg:mr-4` da' o respiro dos DOIS lados no computador — sem o
          `mr` a coluna encostava no conteudo e os textos quase se tocavam
          (ele apontou em 29/08/2026). O `ml` repete o afastamento da borda,
          que no modo `sticky` o `left-3` do `fixed` nao aplica. —
          la' o painel tem folga dos 4 lados da tela. Cantos bem arredondados
          (--radius-xl, 24px) reforcam a leitura de "objeto pousado".

          Vidro CLARO e translucido: --sidebar-v2-painel + blur proprio, e nao
          o degrade solido da v1 — a referencia e' um fosco raso, nao um
          gradiente de cor forte. */}
      <aside
        className={`fixed inset-y-3 left-3 z-50 flex w-[var(--sidebar-w)] flex-col gap-4 overflow-hidden rounded-[var(--radius-xl)] px-3 pt-4 pb-3 shadow-[var(--shadow-raise)] transition-[transform,padding] duration-200 lg:sticky lg:top-3 lg:mr-4 lg:ml-3 lg:h-[calc(100vh-1.5rem)] lg:translate-x-0 ${
          aberto ? "translate-x-0" : "-translate-x-[120%]"
        } ${recolhida ? "lg:px-[11px]" : ""}`}
        style={{
          background: "var(--sidebar-v2-painel)",
          backdropFilter: "var(--blur-painel)",
          WebkitBackdropFilter: "var(--blur-painel)",
          border: "1px solid var(--sidebar-v2-borda)",
        }}
        aria-label="Menu principal"
      >
        {/* Cabecalho: a MARCA, como na v1 (pedido dele em 29/08/2026). A
            referencia poe avatar e saudacao aqui, mas o nome do professor ja'
            aparece no cartao do rodape — repetir gastaria o topo com dado
            duplicado em vez da identidade do produto. */}
        <div
          className={`flex items-center gap-[9px] px-1 pt-0.5 ${
            recolhida ? "lg:flex-col lg:gap-2.5 lg:px-0" : ""
          }`}
        >
          <span
            className="grid h-[30px] w-[30px] flex-none place-items-center overflow-hidden rounded-full"
            aria-hidden
          >
            <Image
              src="/logo-cupcam.png"
              alt=""
              width={30}
              height={30}
              className="h-full w-full object-contain"
              priority
            />
          </span>
          {/* Traco fino entre a logo e o nome — o mesmo da v1. Some quando a
              coluna recolhe, junto com o nome. */}
          <span
            className={`h-[18px] w-px flex-none ${recolhida ? "lg:hidden" : ""}`}
            style={{ background: "var(--sidebar-v2-borda)" }}
            aria-hidden
          />
          <span
            className={`text-[16px] font-semibold ${recolhida ? "lg:hidden" : ""}`}
            style={{
              color: "var(--sidebar-v2-text)",
              fontFamily: "var(--font-display)",
              letterSpacing: "-0.02em",
            }}
          >
            Cupcam
          </span>

          <button
            type="button"
            onClick={aoFechar}
            className="-m-1 ml-auto rounded-lg p-3 lg:hidden"
            style={{ color: "var(--sidebar-v2-text-muted)" }}
            aria-label="Fechar menu"
          >
            <IconFechar />
          </button>

          <button
            type="button"
            onClick={alternarRecolhida}
            aria-expanded={!recolhida}
            title={recolhida ? "Expandir menu" : "Recolher menu"}
            aria-label={recolhida ? "Expandir menu" : "Recolher menu"}
            className={`hidden h-7 w-7 flex-none place-items-center rounded-lg transition-colors lg:grid ${
              recolhida ? "" : "ml-auto"
            }`}
            style={{ color: "var(--sidebar-v2-text-muted)" }}
            onMouseEnter={(evento) => {
              evento.currentTarget.style.background =
                "var(--sidebar-v2-item-hover)";
            }}
            onMouseLeave={(evento) => {
              evento.currentTarget.style.background = "transparent";
            }}
          >
            <IconRecolherMenu
              size={16}
              className={recolhida ? "rotate-180" : undefined}
            />
          </button>
        </div>

        {/* Traco fino que separa o cabecalho do menu, como na referencia
            (uma linha sutil sob a saudacao). */}
        <span
          className="h-px w-full flex-none"
          style={{ background: "var(--sidebar-v2-borda)" }}
          aria-hidden
        />

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">
          {/* Grupo "Sala de aula": itens soltos no painel, pilula solida no
              ativo — igual ao grupo "Menu" da referencia. */}
          <div>
            <p
              className={`mb-1.5 flex items-baseline gap-1 px-2 text-[10px] font-bold uppercase ${
                recolhida ? "lg:hidden" : ""
              }`}
              style={{
                color: "var(--sidebar-v2-text-muted)",
                letterSpacing: "0.1em",
              }}
            >
              {GRUPOS[0].rotulo}
              {/* O CONTADOR da referencia ("Menu: 6"): quantos itens o grupo
                  tem, no mesmo peso do rotulo — nao e' destaque, e' inventario. */}
              <span aria-hidden>· {GRUPOS[0].itens.length}</span>
            </p>

            <nav className="flex flex-col gap-1">
              {GRUPOS[0].itens.map(({ rotulo, href, Icone }) => (
                <ItemDeMenu
                  key={href}
                  rotulo={rotulo}
                  href={href}
                  Icone={Icone}
                  ativo={caminho.startsWith(href)}
                  recolhida={recolhida}
                  aoFechar={aoFechar}
                />
              ))}
            </nav>
          </div>

          {/* Grupo "Apoio": SEM cartao proprio (pedido dele em 29/08/2026). A
              referencia embrulha esse grupo numa camada branca, mas aqui ela
              competia com a pilula do item ativo por atencao — o rotulo com o
              contador ja' separa os dois grupos. */}
          <div>
            <p
              className={`mb-1.5 flex items-baseline gap-1 px-2 text-[10px] font-bold uppercase ${
                recolhida ? "lg:hidden" : ""
              }`}
              style={{
                color: "var(--sidebar-v2-text-muted)",
                letterSpacing: "0.1em",
              }}
            >
              {GRUPOS[1].rotulo}
              <span aria-hidden>· {GRUPOS[1].itens.length}</span>
            </p>

            <nav className="flex flex-col gap-1">
              {GRUPOS[1].itens.map(({ rotulo, href, Icone }) => (
                <ItemDeMenu
                  key={href}
                  rotulo={rotulo}
                  href={href}
                  Icone={Icone}
                  ativo={caminho.startsWith(href)}
                  recolhida={recolhida}
                  aoFechar={aoFechar}
                />
              ))}
            </nav>
          </div>
        </div>

        {/* Rodape: so' o cartao de perfil. O botao circular de acao da
            referencia saiu (pedido dele em 29/08/2026) — la' ele e' "criar
            tarefa", e aqui nao havia acao equivalente: virava um atalho a mais
            pra uma tela que ja' esta no menu logo acima. */}
        <div className="mt-auto">
          <div
            className={`flex items-center gap-[9px] rounded-[12px] p-[9px] ${
              recolhida ? "lg:justify-center lg:px-0 lg:py-[7px]" : ""
            }`}
            style={{ background: "var(--sidebar-v2-cartao)" }}
          >
            <span
              className="grid h-[31px] w-[31px] flex-none place-items-center rounded-full text-[12px] text-white"
              style={{ background: "var(--violet-800)", fontWeight: 620 }}
              aria-hidden
            >
              GQ
            </span>
            <div className={`min-w-0 ${recolhida ? "lg:hidden" : ""}`}>
              <div
                className="truncate text-[12.5px] leading-[1.25] font-semibold"
                style={{ color: "var(--sidebar-v2-text)" }}
              >
                Guilherme
              </div>
              <div
                className="truncate text-[11.5px]"
                style={{ color: "var(--sidebar-v2-text-muted)" }}
              >
                Professor
              </div>
            </div>
          </div>

        </div>
      </aside>
    </>
  );
}

type ItemDeMenuProps = {
  rotulo: string;
  href: string;
  Icone: ComponentType<{ size?: number; className?: string }>;
  ativo: boolean;
  recolhida: boolean;
  aoFechar: () => void;
};

/** Um item do menu — extraido pra nao repetir o par pilula/hover nos dois
    grupos (um solto no painel, outro dentro do cartao branco). */
function ItemDeMenu({
  rotulo,
  href,
  Icone,
  ativo,
  recolhida,
  aoFechar,
}: ItemDeMenuProps) {
  return (
    <Link
      href={href}
      onClick={aoFechar}
      aria-current={ativo ? "page" : undefined}
      title={rotulo}
      /* `rounded-[10px]`, e nao `rounded-full` (pedido dele em 29/08/2026):
         canto mais fechado, quadrado o bastante pra o item ler como bloco e
         nao como capsula. O item continua solto dentro do painel — nao sangra
         ate' a borda como na v1. */
      className={`flex items-center rounded-[10px] text-[13.5px] transition-colors ${
        recolhida
          ? "gap-2.5 px-3 py-2.5 lg:justify-center lg:gap-0 lg:px-0"
          : "gap-2.5 px-3 py-2.5"
      }`}
      style={{
        fontWeight: ativo ? 600 : 520,
        background: ativo ? "var(--sidebar-v2-item-active)" : "transparent",
        color: ativo ? "var(--text-on-brand)" : "var(--sidebar-v2-text)",
      }}
      onMouseEnter={(evento) => {
        if (!ativo) {
          evento.currentTarget.style.background =
            "var(--sidebar-v2-item-hover)";
        }
      }}
      onMouseLeave={(evento) => {
        if (!ativo) {
          evento.currentTarget.style.background = "transparent";
        }
      }}
    >
      <Icone size={16} />
      <span className={recolhida ? "lg:hidden" : ""}>{rotulo}</span>
    </Link>
  );
}
