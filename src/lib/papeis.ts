/**
 * Quem abre qual tela (subprojetos B+C, 03/10/2026).
 *
 * A trava de verdade e' o backend (403 pra rota fora do papel, 404 pro dado
 * de outra pessoa). Isto decide o menu, o redirecionamento das paginas e um
 * corte cedo nas pontes /api/* -- e, nas pontes da CAMERA, e' a unica trava:
 * o notebook nao tem as sessoes de login pra conferir o papel sozinho.
 *
 * Modulo puro, testado com `node --test` (papeis.test.ts).
 */

export type Papel = "admin" | "coordenacao" | "professor";

const TELAS_DO_PROFESSOR = ["/", "/aulas", "/chamada", "/relatorios", "/camera"];
const TELAS_DA_COORDENACAO = ["/coordenacao"];
const TELAS_COMUNS = ["/ia", "/configuracoes", "/sair"];

/** Pontes que so' a coordenacao (e o admin) usam. */
const PONTES_DA_COORDENACAO = ["/api/coordenacao", "/api/admin/visao", "/api/admin/panorama"];

/**
 * Pontes que so' o professor (e o admin) usam. /api/camera vem primeiro na
 * lista de motivos: o notebook nao confere papel, entao o corte e' aqui.
 */
const PONTES_DO_PROFESSOR = [
  "/api/camera",
  "/api/chamada",
  "/api/conteudo",
  "/api/continuidade",
  "/api/diario",
  "/api/lousas",
  "/api/relatorios-periodo",
  "/api/transcricao",
  "/api/ia/aulas",
  "/api/ia/listas",
  "/api/ia/planos",
  "/api/ia/exportar",
];

function ePapel(valor: string): valor is Papel {
  return valor === "admin" || valor === "coordenacao" || valor === "professor";
}

/** O caminho e' `base` ou esta' dentro dele ("/aulas/3" esta' em "/aulas"; "/aulasx" nao). */
function dentroDe(caminho: string, base: string): boolean {
  if (base === "/") return caminho === "/";
  return caminho === base || caminho.startsWith(`${base}/`);
}

/** Telas do menu de cada papel, na ordem em que aparecem. */
export function telasDoPapel(papel: Papel): string[] {
  if (papel === "admin") return [...TELAS_DO_PROFESSOR, ...TELAS_DA_COORDENACAO, ...TELAS_COMUNS];
  if (papel === "coordenacao") return [...TELAS_DA_COORDENACAO, ...TELAS_COMUNS];
  return [...TELAS_DO_PROFESSOR, ...TELAS_COMUNS];
}

/** Pra onde o papel vai ao entrar (e ao bater numa tela que nao e' dele). */
export function telaInicial(papel: string): "/" | "/coordenacao" {
  return papel === "coordenacao" ? "/coordenacao" : "/";
}

/**
 * O papel pode abrir este caminho? `papel` chega como texto do cookie: papel
 * desconhecido (cookie antigo, conta de aluno) nao abre nada.
 */
export function podeAbrir(papel: string, caminho: string): boolean {
  if (!ePapel(papel)) return false;
  if (papel === "admin") return true;

  if (caminho === "/api" || caminho.startsWith("/api/")) {
    if (PONTES_DA_COORDENACAO.some((base) => dentroDe(caminho, base))) {
      return papel === "coordenacao";
    }
    if (PONTES_DO_PROFESSOR.some((base) => dentroDe(caminho, base))) {
      return papel === "professor";
    }
    return true; // o resto o backend decide
  }

  return telasDoPapel(papel).some((base) => dentroDe(caminho, base));
}
