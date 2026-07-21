import type { Metadata } from "next";
import { Geologica, Inter } from "next/font/google";

import { ThemeProvider } from "@/components/theme/theme-provider";
import { ThemeScript } from "@/components/theme/theme-script";

import "./globals.css";

/* Fontes do design system Strix/Cupcam. O next/font baixa e hospeda os
   arquivos junto do app: nada e' pedido ao Google em producao (mais rapido
   e sem vazar o IP de quem acessa para um terceiro). */
const geologica = Geologica({
  variable: "--font-geologica",
  subsets: ["latin"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
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
      className={`${geologica.variable} ${inter.variable} h-full antialiased`}
    >
      <head>
        <ThemeScript />
      </head>
      <body className="bg-bg text-text-body min-h-full">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
