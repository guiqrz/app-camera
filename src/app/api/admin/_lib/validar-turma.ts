import type { NovaTurma } from "@/lib/types";

/**
 * Valida o corpo JSON de criacao/edicao de turma vindo do navegador.
 *
 * Mora aqui (e nao em cada route handler) porque POST /turmas e PUT /turmas/{id}
 * gravam na MESMA tabela: se as duas validacoes divergirem, abre um buraco
 * assimetrico — um dado recusado na criacao entraria pela edicao, em silencio.
 *
 * Turma e' so' nome + sala: a agenda (dia/hora) mudou pras aulas
 * (`/admin/turmas/{id}/aulas`). Exigir horario aqui rejeitaria com 400 todo
 * corpo valido que a tela manda.
 */
export function validarNovaTurma(dados: unknown): dados is NovaTurma {
  if (typeof dados !== "object" || dados === null) return false;
  const d = dados as Record<string, unknown>;
  return (
    typeof d.nome === "string" &&
    d.nome.trim() !== "" &&
    typeof d.sala_id === "string" &&
    d.sala_id.trim() !== ""
  );
}
