import { aparenciaDaCorMateria } from "@/lib/format";
import type { CorMateria } from "@/lib/types";

type EtiquetaMateriaProps = {
  /** Nome da materia. `null` = aula sem materia atribuida. */
  nome: string | null;
  /** Cor da materia. `null` = materia sem cor: o nome aparece sem grifo. */
  cor: CorMateria | null;
  /** Texto mostrado quando `nome` e' nulo. */
  textoSemMateria?: string;
  className?: string;
};

/**
 * Nome da materia com o grifo da cor dela.
 *
 * A cor e' um GRIFO atras do texto, nao um ponto ou uma borda: o objetivo e'
 * bater o olho na grade e reconhecer a materia pela cor. Materia sem cor
 * aparece como texto simples — sem grifo neutro, que competiria visualmente
 * com as materias que tem cor de verdade.
 *
 * A cor nunca e' a UNICA portadora da informacao: o nome escrito esta sempre
 * ali (WCAG 1.4.1, "Use of Color"), entao quem nao distingue as cores nao
 * perde nada.
 */
export function EtiquetaMateria({
  nome,
  cor,
  textoSemMateria = "Sem matéria",
  className,
}: EtiquetaMateriaProps) {
  const aparencia = nome === null ? null : aparenciaDaCorMateria(cor);

  if (aparencia === null) {
    return (
      <span className={`text-text-muted truncate ${className ?? ""}`}>
        {nome ?? textoSemMateria}
      </span>
    );
  }

  return (
    <span
      className={`inline-block max-w-full truncate rounded px-1.5 py-0.5 font-semibold ${className ?? ""}`}
      style={{ background: aparencia.fundo, color: aparencia.texto }}
    >
      {nome}
    </span>
  );
}
