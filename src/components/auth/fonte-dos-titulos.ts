import { Cal_Sans } from "next/font/google";

/* Fonte dos titulos do site Strix (Cal Sans), so' nas paginas de link: o
   resto do app usa so' a Montserrat. O next/font hospeda o arquivo junto do
   app (nada e' pedido ao Google em producao), como a Montserrat do layout
   raiz. A pagina passa `fonteDosTitulos.variable` pra PaginaAuth, e o CSS
   portado le --font-cal-sans. */
export const fonteDosTitulos = Cal_Sans({
  variable: "--font-cal-sans",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
  // O Next nao tem as medidas da Cal Sans pra montar a fonte reserva
  // ajustada (avisava no build); a reserva ja' e' a Montserrat, pelo CSS.
  adjustFontFallback: false,
});
