import type { CSSProperties } from "react";

type AvatarAlunoProps = {
  nome: string;
  /** RA do aluno — define a cor, estavel entre renderizacoes e telas. */
  ra: string;
  /** Lado em pixels. Padrao 40 (lista); o detalhe usa 64. */
  tamanho?: number;
};

/** Iniciais do primeiro e do segundo nome ("Ana Beatriz Silva" -> "AB"). */
function iniciaisDe(nome: string): string {
  const partes = nome.trim().split(/\s+/);
  const primeira = partes[0]?.[0] ?? "?";
  const segunda = partes[1]?.[0] ?? "";
  return (primeira + segunda).toUpperCase();
}

/** Duas paletas alternadas, como no desenho (violeta e ciano). */
const PALETAS: { fundo: string; texto: string }[] = [
  { fundo: "var(--violet-100)", texto: "var(--violet-700)" },
  { fundo: "var(--cyan-100)", texto: "var(--cyan-800)" },
];

/**
 * Avatar circular com as iniciais do aluno.
 *
 * A cor vem de um hash do RA, nao da posicao na lista: assim o mesmo aluno
 * tem sempre a mesma cor, mesmo com a lista filtrada ou reordenada.
 */
export function AvatarAluno({ nome, ra, tamanho = 40 }: AvatarAlunoProps) {
  let hash = 0;
  for (const caractere of ra) hash += caractere.charCodeAt(0);
  const paleta = PALETAS[hash % PALETAS.length];

  const estilo: CSSProperties = {
    width: tamanho,
    height: tamanho,
    background: paleta.fundo,
    color: paleta.texto,
    fontSize: Math.round(tamanho / 3),
  };

  return (
    <span
      className="flex flex-none items-center justify-center rounded-full font-extrabold"
      style={estilo}
      aria-hidden
    >
      {iniciaisDe(nome)}
    </span>
  );
}
