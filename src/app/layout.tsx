import type { Metadata } from "next";
import { Montserrat } from "next/font/google";

import {
  ProvedorUsuarioLogado,
  type UsuarioLogado,
} from "@/components/layout/usuario-logado";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { ThemeScript } from "@/components/theme/theme-script";
import { lerSessaoDoServidor } from "@/lib/sessao-cookie";

import "./globals.css";

/* Fonte do redesign (13/08/2026): uma familia so', com o contraste vindo do
   PESO — 300 no corpo, 600 nos titulos. Substituiu o par Geologica + Inter.

   Os 4 pesos sao os que a UI usa de fato; pedir a familia inteira (9 pesos)
   dobraria o download sem nada aparecer na tela.

   O next/font baixa e hospeda os arquivos junto do app: nada e' pedido ao
   Google em producao (mais rapido e sem vazar o IP de quem acessa). */
const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Cupcam Insights",
  description:
    "Painel do professor: chamada automatica e indicadores de engajamento da turma.",
};

/**
 * Quem esta logado, lido do cookie assinado. So' leitura local (HMAC), sem ir
 * a API: quem confere com o backend se a sessao ainda vale e' o proxy, que ja'
 * rodou antes daqui.
 *
 * Falha de configuracao (segredo ausente) NAO derruba o layout: ele tambem
 * desenha a tela de erro do login, que precisa abrir justamente quando algo
 * esta mal configurado. O proxy ja' barra as telas protegidas nesse caso.
 */
async function lerUsuarioLogado(): Promise<UsuarioLogado | null> {
  try {
    const lida = await lerSessaoDoServidor();
    // Copia so' o que a tela mostra: o id da sessao nao pode ir pro navegador.
    return lida ? { nome: lida.nome, email: lida.email, papel: lida.papel } : null;
  } catch (causa) {
    console.error("[layout] nao foi possivel ler o usuario logado:", causa);
    return null;
  }
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const usuario = await lerUsuarioLogado();

  return (
    <html
      lang="pt-BR"
      // suppressHydrationWarning: o ThemeScript altera data-theme antes do
      // React montar, entao o HTML do servidor e o do cliente divergem de
      // proposito neste atributo. O aviso do React aqui e' esperado.
      suppressHydrationWarning
      className={`${montserrat.variable} h-full antialiased`}
    >
      <head>
        <ThemeScript />
      </head>
      <body className="bg-bg text-text-body min-h-full">
        {/* A atmosfera fica no body, fora do ThemeProvider e de qualquer
            rota: ela e' fixed e vale pra todas as telas. Aqui em cima ela
            aparece tambem nas paginas de erro e de carregamento, que nao
            passam pelo AppShell — sem isso o fundo "piscaria" chapado
            durante a navegacao. aria-hidden: e' decoracao pura. */}
        <div className="atmosfera" aria-hidden="true" />
        <ThemeProvider>
          <ProvedorUsuarioLogado usuario={usuario}>{children}</ProvedorUsuarioLogado>
        </ThemeProvider>
      </body>
    </html>
  );
}
