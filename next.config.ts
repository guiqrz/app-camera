import type { NextConfig } from "next";

/* Politica de seguranca de conteudo (CSP).
 *
 * ENTRA COMO Report-Only DE PROPOSITO. Uma CSP ligada direto quebra a aplicacao
 * em silencio: o navegador simplesmente nao executa o que a politica proibe, sem
 * erro visivel na tela. O caminho seguro e' medir primeiro — o navegador reporta
 * no console tudo que a politica BLOQUEARIA — e so' promover pra enforcing
 * depois de navegar por todas as telas sem nenhuma violacao registrada.
 *
 * Por que cada diretiva e' o que e':
 *
 * default-src 'self'   tudo que a pagina carrega vem do proprio dominio. E' o
 *                      fecho padrao; as diretivas abaixo abrem so' o necessario.
 *
 * script-src           'unsafe-inline' e 'unsafe-eval' estao aqui porque o Next
 *                      injeta script inline pra hidratacao e o React em modo de
 *                      desenvolvimento usa eval. Isso ENFRAQUECE a protecao
 *                      contra XSS — e' a diretiva a endurecer quando a CSP
 *                      virar enforcing, trocando por nonce por requisicao.
 *
 * style-src            'unsafe-inline' e' exigido pelo Tailwind e pelos estilos
 *                      inline dos componentes. Risco baixo: CSS injetado nao
 *                      executa codigo.
 *
 * img-src              data: e blob: porque as lousas capturadas chegam como
 *                      imagem embutida, sem passar por URL de arquivo.
 *
 * font-src 'self'      o next/font/google BAIXA e HOSPEDA a fonte junto do app
 *                      (ver o comentario em app/layout.tsx). Nada e' pedido ao
 *                      Google em tempo de execucao, entao nao ha host externo
 *                      pra liberar aqui.
 *
 * connect-src 'self'   o cliente so' fala com rotas relativas (/api/...). Quem
 *                      fala com a API do CUPCAM e' o SERVIDOR do Next, e trafego
 *                      de servidor nao passa por CSP — ela vale no navegador.
 *                      Por isso a URL da API nao precisa ser liberada aqui, e e'
 *                      tambem por isso que a X-API-Key nunca chega ao cliente
 *                      (lib/api.ts importa "server-only").
 *
 * frame-ancestors      ninguem pode embutir o app num iframe. E' a versao
 *                      moderna do X-Frame-Options; os dois ficam porque
 *                      navegador antigo so' entende o header.
 *
 * object-src 'none'    <object>/<embed> sao vetor classico de execucao. O app
 *                      nao usa nenhum dos dois.
 *
 * base-uri 'self'      impede que um <base> injetado reescreva o destino de
 *                      todo caminho relativo da pagina.
 *
 * form-action 'self'   um formulario so' pode postar pro proprio dominio. Trava
 *                      exfiltracao via <form> injetado.
 */
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

/* Cabecalhos aplicados a TODA resposta.
 *
 * A recomendacao da OWASP e' explicita nesse ponto: o cabecalho de seguranca
 * vale em toda resposta a toda requisicao, nao so' no documento principal.
 */
const CABECALHOS_DE_SEGURANCA = [
  {
    key: "Content-Security-Policy-Report-Only",
    value: CSP,
  },
  {
    /* HSTS: o navegador passa a recusar HTTP neste dominio, e nao deixa o
     * usuario clicar em "prosseguir mesmo assim" num certificado invalido.
     *
     * max-age de 2 anos + preload e' o que a MDN recomenda hoje; preload e'
     * requisito pra entrar na lista embutida do Chromium, Edge e Firefox.
     *
     * O cabecalho SO' vale enviado sobre HTTPS — o navegador ignora de
     * proposito quando ele chega por HTTP, pra impedir que um atacante no meio
     * do caminho o forje. Em desenvolvimento (http://localhost) ele e' inerte.
     *
     * Cuidado ao mexer: includeSubDomains vale pra TODO subdominio, e o
     * compromisso dura o max-age inteiro no navegador de quem ja' visitou.
     * Reduzir depois exige servir um max-age menor e esperar expirar.
     */
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    /* Impede o navegador de adivinhar o tipo do arquivo pelo conteudo. Sem
     * isso, um upload que o servidor rotula como texto pode ser reinterpretado
     * como script e executado.
     */
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    /* Ao sair do app, envia so' a origem, nunca o caminho completo. Evita que
     * um site externo receba no Referer a URL de uma tela interna — que aqui
     * carrega id de sessao e de turma.
     */
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    /* Anti-clickjacking pra navegador que nao entende frame-ancestors. */
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    /* O app nunca pede camera, microfone ou localizacao PELO NAVEGADOR: a
     * camera da sala e' operada pelo backend, na maquina da sala. Negar aqui
     * fecha a porta pra qualquer script de terceiro que tente pedir.
     */
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Casa com toda rota, incluindo as de API.
        source: "/:path*",
        headers: CABECALHOS_DE_SEGURANCA,
      },
    ];
  },
};

export default nextConfig;
