import type { Metadata } from "next";
import { Montserrat } from "next/font/google";

import { ThemeProvider } from "@/components/theme/theme-provider";
import { ThemeScript } from "@/components/theme/theme-script";

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
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
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
