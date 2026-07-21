/**
 * Script que aplica o tema salvo ANTES da primeira pintura da pagina.
 *
 * Sem isso a pagina pisca em branco antes de virar escura ("flash of
 * unstyled content"): o React so roda depois que o HTML ja apareceu na
 * tela, e ate la o tema padrao (claro) esta valendo.
 *
 * Roda de forma sincrona no <head>, entao o atributo data-theme ja existe
 * quando o navegador desenha o primeiro pixel. E deliberadamente minusculo
 * porque bloqueia a renderizacao enquanto executa.
 */

/** Chave do localStorage — mesma usada pelo Chamada.dc.html do design. */
export const THEME_STORAGE_KEY = "cupcam-theme";

const script = `
(function () {
  try {
    var saved = localStorage.getItem('${THEME_STORAGE_KEY}');
    if (saved === 'dark' || saved === 'light') {
      document.documentElement.setAttribute('data-theme', saved);
    }
    // Sem preferencia salva: nao marca nada e deixa a media query
    // prefers-color-scheme de semantic.css decidir.
  } catch (e) {
    // localStorage bloqueado (modo anonimo restrito). Segue no tema padrao.
  }
})();
`;

export function ThemeScript() {
  return (
    <script
      // Conteudo fixo e escrito por nos, sem entrada de usuario.
      dangerouslySetInnerHTML={{ __html: script }}
    />
  );
}
