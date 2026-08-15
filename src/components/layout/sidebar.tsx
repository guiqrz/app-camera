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

/** Onde a escolha de recolher a sidebar sobrevive entre visitas. */
const CHAVE_RECOLHIDA = "cupcam:sidebar-recolhida";

type ItemMenu = {
  rotulo: string;
  href: string;
  Icone: ComponentType<{ size?: number; className?: string }>;
};

/**
 * O menu em DOIS grupos, como no prototipo: o que se usa durante a aula e o
 * que da' apoio a ela. O rotulo do grupo e' o unico texto em maiuscula da
 * tela — ele separa sem precisar de linha divisoria.
 */
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
      // A marca do CUPCAM no lugar de um icone de traco. Em SVG de cor unica,
      // entao acompanha a cor do item — que muda quando ele esta ativo.
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

export function Sidebar({ aberto, aoFechar }: SidebarProps) {
  const caminho = usePathname();

  // Recolhida = so' os icones, 62px. A largura vive em `--sidebar-w`, que o
  // grid do AppShell E a faixa lateral da atmosfera ja' consomem — trocar a
  // variavel num ponto so' realarga o conteudo e reposiciona a faixa juntos.
  //
  // A classe vai no `<html>`, e nao no proprio `<aside>`, porque a `.atmosfera`
  // e' irma do shell: com a variavel definida so' dentro dele, a faixa de cor
  // nao acompanharia o recolhimento e sobraria pintada na largura antiga.
  const [recolhida, setRecolhida] = useState(false);

  // Leitura do localStorage depois da montagem, como em painel-privacidade.tsx:
  // no servidor nao existe, e ler no primeiro render do cliente divergiria na
  // hidratacao.
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

      {/* Medidas do prototipo (.sidebar): 218px, padding 20px 12px 16px, gap
          20px, borda direita branca a 7%.

          FUNDO TRANSPARENTE, e nao `--surface`. Este era o "muito forte" que
          ele viu: com uma cor propria por cima, a sidebar lia como chapa
          colada sobre a faixa violeta da atmosfera. Na medicao da referencia
          ela NAO tem cor propria — o mesmo gradiente da pagina atravessa, e o
          que a separa e' a SATURACAO, nao um veu.

          SATURACAO ALTA, BLUR BAIXO: e' `saturate(155%)` que puxa a cor da
          faixa por baixo e da' o efeito; um blur forte aqui borraria o
          gradiente ate virar cinza. No celular vira gaveta OPACA (`max-lg`),
          senao daria pra ler a pagina atraves do menu. */}
      <aside
        className={`max-lg:bg-bg fixed inset-y-0 left-0 z-50 flex w-[var(--sidebar-w)] flex-col gap-5 overflow-hidden px-3 pt-5 pb-4 transition-[transform,padding] duration-200 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${
          aberto ? "translate-x-0" : "-translate-x-full"
        } ${recolhida ? "lg:px-[11px]" : ""}`}
        style={{
          background: "transparent",
          borderRight: "1px solid rgba(255, 255, 255, 0.07)",
          backdropFilter: "saturate(155%) blur(10px)",
        }}
        aria-label="Menu principal"
      >
        {/* Recolhida o botao desce pra propria linha e centraliza: na coluna
            de 62px ele nao cabe ao lado do glifo. */}
        <div
          className={`flex items-center gap-[9px] px-2 pt-0.5 ${
            recolhida ? "lg:flex-col lg:gap-2.5 lg:px-0" : ""
          }`}
        >
          {/* Logo enviada em 15/08, recortada do fundo preto original
              (`public/logo-cupcam.png`, transparencia via limiar de
              luminancia) — substitui o glifo tipografico "C" que ficava
              aqui antes. Mantido o mesmo circulo de 30px como moldura, pra
              nao mudar o ritmo do cabecalho da sidebar; `object-contain`
              encolhe a arte pra caber sem cortar as pontas da espiral. */}
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
          {/* Traço fino entre a logo e o nome, pedido dele em 15/08. Reusa
              `--border` (a mesma borda suave dos cards de vidro) em vez de
              uma cor nova — some quando a sidebar recolhe, junto com o
              nome. */}
          <span
            className={`h-[18px] w-px flex-none ${recolhida ? "lg:hidden" : ""}`}
            style={{ background: "var(--border)" }}
            aria-hidden
          />
          <span
            className={`text-text text-[16px] font-semibold ${
              recolhida ? "lg:hidden" : ""
            }`}
            style={{
              fontFamily: "var(--font-display)",
              letterSpacing: "-0.02em",
            }}
          >
            Cupcam
          </span>

          {/* p-3 (nao p-1): media 26px, abaixo do piso de 44px para o dedo. */}
          <button
            type="button"
            onClick={aoFechar}
            className="text-text-muted -m-1 ml-auto rounded-lg p-3 lg:hidden"
            aria-label="Fechar menu"
          >
            <IconFechar />
          </button>

          {/* So' no computador: no celular a sidebar ja' e' uma gaveta que
              some inteira, entao recolher pra 62px nao teria sentido.
              `aria-expanded` conta o estado; o rotulo descreve a PROXIMA acao,
              que e' o que o leitor de tela precisa anunciar. */}
          <button
            type="button"
            onClick={alternarRecolhida}
            aria-expanded={!recolhida}
            title={recolhida ? "Expandir menu" : "Recolher menu"}
            aria-label={recolhida ? "Expandir menu" : "Recolher menu"}
            className={`text-text-muted hover:bg-surface-2 hover:text-text hidden h-7 w-7 flex-none place-items-center rounded-lg transition-colors lg:grid ${
              recolhida ? "" : "ml-auto"
            }`}
          >
            {/* A seta gira pra apontar pro lado que a acao leva. */}
            <IconRecolherMenu
              size={16}
              className={recolhida ? "rotate-180" : undefined}
            />
          </button>
        </div>

        {GRUPOS.map((grupo) => (
          <div key={grupo.rotulo}>
            {/* `display:none`, e nao opacity/largura: texto invisivel mas
                presente continuaria sendo lido em voz alta e ainda ocuparia
                espaco no calculo do flex. */}
            <p
              className={`text-text-muted mt-2.5 mb-1.5 px-2.5 text-[10px] font-bold uppercase ${
                recolhida ? "lg:hidden" : ""
              }`}
              style={{ letterSpacing: "0.12em" }}
            >
              {grupo.rotulo}
            </p>

            <nav className="flex flex-col gap-0.5">
              {grupo.itens.map(({ rotulo, href, Icone }) => {
                const ativo = caminho.startsWith(href);

                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={aoFechar}
                    aria-current={ativo ? "page" : undefined}
                    // Sem rotulo visivel, o `title` vira a unica pista do que
                    // o item e' — por isso ele vai em todos, nao so' nos
                    // recolhidos.
                    title={rotulo}
                    className={`hover:bg-surface-2 flex items-center rounded-[9px] text-[13.5px] transition-colors ${
                      recolhida
                        ? "gap-2.5 px-2.5 py-2 lg:justify-center lg:gap-0 lg:px-0 lg:py-2.5"
                        : "gap-2.5 px-2.5 py-2"
                    }`}
                    style={{
                      // 520 e' o peso do prototipo; o ativo sobe pra 600.
                      fontWeight: ativo ? 600 : 520,
                      background: ativo ? "var(--primary)" : "transparent",
                      color: ativo
                        ? "var(--text-on-brand)"
                        : "var(--text-body)",
                    }}
                  >
                    <Icone size={16} />
                    <span className={recolhida ? "lg:hidden" : ""}>
                      {rotulo}
                    </span>
                  </Link>
                );
              })}
            </nav>
          </div>
        ))}

        {/* `mt-auto` cola no pe da coluna. O cartao do professor mora AQUI, e
            nao no cabecalho: o prototipo poe a identidade junto da navegacao,
            deixando o topo de cada tela so' pro titulo e pelos controles. */}
        <div className="mt-auto">
          <div
            className={`border-border-default flex items-center gap-[9px] rounded-[12px] border ${
              recolhida ? "p-[9px] lg:justify-center lg:px-0 lg:py-[7px]" : "p-[9px]"
            }`}
            style={{ background: "var(--surface)" }}
          >
            <span
              className="grid h-[31px] w-[31px] flex-none place-items-center rounded-full text-[12px] text-white"
              style={{ background: "var(--violet-800)", fontWeight: 620 }}
              aria-hidden
            >
              GQ
            </span>
            <div className={`min-w-0 ${recolhida ? "lg:hidden" : ""}`}>
              <div className="text-text truncate text-[12.5px] leading-[1.25] font-semibold">
                Guilherme
              </div>
              <div className="text-text-muted truncate text-[11.5px]">
                Professor
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
