"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

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
 * Avatar circular do aluno: a miniatura cadastrada quando existe, as iniciais
 * quando nao.
 *
 * A cor das iniciais vem de um hash do RA, nao da posicao na lista: assim o
 * mesmo aluno tem sempre a mesma cor, mesmo com a lista filtrada ou reordenada.
 *
 * A FOTO e' a `foto_thumb` do cadastro — a miniatura de ~96-128px que o projeto
 * autoriza guardar; a original nunca e' salva. Ela chega pela ponte
 * `/api/admin/alunos/{ra}/foto`, que responde 404 pra quem nao tem: o `onError`
 * abaixo entao cai nas iniciais. Isso NAO e' caso raro — no banco real, 5 dos 8
 * alunos estao sem foto.
 */
export function AvatarAluno({ nome, ra, tamanho = 40 }: AvatarAlunoProps) {
  // Comeca otimista (tenta a foto) e desiste no primeiro erro. Sem estado
  // "carregando": o circulo com as iniciais ja' esta desenhado por tras, entao
  // a foto aparece por cima quando chega — nunca ha buraco no lugar dela.
  const [semFoto, setSemFoto] = useState(false);
  const foto = useRef<HTMLImageElement>(null);

  // O 404 pode chegar ANTES de o React hidratar a pagina vinda do servidor: o
  // evento de erro dispara sem ninguem escutando, o `onError` nunca roda e o
  // navegador desenha o icone de imagem quebrada por cima das iniciais (visto
  // na chamada e na coordenacao em 01/10/2026). Depois de montar, confere se a
  // imagem ja' terminou sem nenhum pixel. setTimeout(0): mesmo padrao do
  // header.tsx pra leitura de DOM depois da montagem.
  useEffect(() => {
    const imagem = foto.current;
    if (!imagem || !imagem.complete || imagem.naturalWidth > 0) return;
    const id = setTimeout(() => setSemFoto(true), 0);
    return () => clearTimeout(id);
  }, [ra]);

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
      className="relative flex flex-none items-center justify-center overflow-hidden rounded-full font-semibold"
      style={estilo}
      aria-hidden
    >
      {iniciaisDe(nome)}
      {!semFoto && (
        /* next/image exigiria configurar o host e otimizar no servidor; aqui a
           imagem vem da nossa propria ponte, ja' em tamanho de miniatura. */
        // eslint-disable-next-line @next/next/no-img-element
        <img
          ref={foto}
          src={`/api/admin/alunos/${encodeURIComponent(ra)}/foto`}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          onError={() => setSemFoto(true)}
        />
      )}
    </span>
  );
}
