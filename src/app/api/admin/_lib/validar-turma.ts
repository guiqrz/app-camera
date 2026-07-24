import type { NovaTurma } from "@/lib/types";

/**
 * Valida o corpo JSON de criacao/edicao de turma vindo do navegador.
 *
 * Mora aqui (e nao em cada route handler) porque POST /turmas e PUT /turmas/{id}
 * gravam na MESMA tabela: se as duas validacoes divergirem, abre um buraco
 * assimetrico — um dado recusado na criacao entraria pela edicao, em silencio.
 */
export function validarNovaTurma(dados: unknown): dados is NovaTurma {
  if (typeof dados !== "object" || dados === null) return false;
  const d = dados as Record<string, unknown>;
  return (
    typeof d.nome === "string" &&
    d.nome.trim() !== "" &&
    typeof d.sala_id === "string" &&
    d.sala_id.trim() !== "" &&
    typeof d.dia_semana === "number" &&
    Number.isInteger(d.dia_semana) &&
    d.dia_semana >= 0 &&
    d.dia_semana <= 6 &&
    typeof d.hora_inicio === "string" &&
    d.hora_inicio.trim() !== "" &&
    typeof d.hora_fim === "string" &&
    d.hora_fim.trim() !== ""
  );
}
