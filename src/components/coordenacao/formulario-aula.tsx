"use client";

import { useEffect, useRef, useState } from "react";

import { CampoComExemplo } from "@/components/ui/campo-com-exemplo";
import { EtiquetaMateria } from "@/components/ui/etiqueta-materia";
import type { Aula, Materia, NovaAula } from "@/lib/types";
import type { Turno } from "@/lib/turnos";

/** Valor do <option> "Sem matéria" — vira `materia_id: null` no envio. */
const SEM_MATERIA = "";

type FormularioAulaProps = {
  /** Dia da coluna onde o formulario abriu. 0 = domingo ... 6 = sabado. */
  diaSemana: number;
  /** Aula sendo editada; ausente = criando uma aula nova. */
  aula?: Aula | null;
  /** Materias cadastradas, pra popular o dropdown. Lista vazia e' valida. */
  materias: Materia[];
  /** Turno de referencia — so' alimenta o exemplo que o Tab preenche. */
  turno: Turno;
  aoCancelar: () => void;
  /** Rejeita com Error(mensagem) — o formulario mostra o texto e fica aberto. */
  aoSalvar: (dados: NovaAula) => Promise<void>;
};

/**
 * Formulario inline de aula, aberto dentro da coluna do dia na grade semanal.
 *
 * Cria uma aula nova ou edita uma existente — decidido por `aula` estar
 * presente. O dia da semana NAO e' um campo: ele vem da coluna onde o
 * formulario abriu, o que elimina o erro de escolher o dia errado num
 * dropdown depois de ter clicado no dia certo.
 *
 * Validacao de fim > inicio replica a regra do backend (`gestao/aulas.py`) so'
 * pra dar feedback rapido: "HH:MM" compara certo como string porque tem sempre
 * 5 caracteres com zero a esquerda. Ja' o conflito de horario com outra turma
 * so' o backend sabe validar (precisa das aulas das outras turmas na mesma
 * sala) — vira um 409 que a vista repassa como Error e cai no erro inline.
 *
 * ATENCAO no modo editar: o PUT do backend e' substituicao TOTAL do recurso —
 * omitir `materia_id` LIMPA a materia da aula. Por isso o dropdown ja' abre
 * pre-preenchido com a materia atual e o envio sempre manda `materia_id`
 * explicito (o id ou null), nunca omitido.
 */
export function FormularioAula({
  diaSemana,
  aula,
  materias,
  turno,
  aoCancelar,
  aoSalvar,
}: FormularioAulaProps) {
  const editando = Boolean(aula);

  const [horaInicio, setHoraInicio] = useState(aula?.hora_inicio ?? "");
  const [horaFim, setHoraFim] = useState(aula?.hora_fim ?? "");
  const [materiaId, setMateriaId] = useState(
    // Pre-preencher a materia atual nao e' cosmetico: sem isso o PUT apagaria
    // a materia da aula em silencio (substituicao total).
    aula?.materia_id == null ? SEM_MATERIA : String(aula.materia_id),
  );
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  // Materia selecionada no dropdown, so' pra previa da cor logo abaixo dele.
  const materiaEscolhida =
    materiaId === SEM_MATERIA
      ? null
      : (materias.find((materia) => String(materia.id) === materiaId) ?? null);

  const primeiroCampoRef = useRef<HTMLInputElement>(null);

  // O formulario e' montado do zero a cada abertura (a grade usa `key`), entao
  // basta focar na montagem — nao ha transicao fechado->aberto pra detectar.
  useEffect(() => {
    primeiroCampoRef.current?.focus();
  }, []);

  async function aoSubmeter(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();

    if (!horaInicio || !horaFim) {
      setErro("Preencha o horário de início e de fim.");
      return;
    }
    if (horaFim <= horaInicio) {
      setErro("O horário de fim precisa ser depois do horário de início.");
      return;
    }
    setErro(null);

    const dados: NovaAula = {
      dia_semana: diaSemana,
      hora_inicio: horaInicio,
      hora_fim: horaFim,
      // Sempre explicito, inclusive null — ver o aviso no JSDoc do componente.
      materia_id: materiaId === SEM_MATERIA ? null : Number(materiaId),
    };

    setEnviando(true);
    try {
      await aoSalvar(dados);
      // Sucesso: quem chama fecha o formulario e recarrega a grade.
    } catch (causa) {
      setErro(
        causa instanceof Error
          ? causa.message
          : `Não foi possível ${editando ? "salvar" : "criar"} a aula.`,
      );
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form
      onSubmit={aoSubmeter}
      noValidate
      className="flex flex-col gap-3 rounded-xl p-3"
      style={{
        background: "var(--surface)",
        border: "1.5px solid var(--primary)",
      }}
    >
      <CampoComExemplo
        ref={primeiroCampoRef}
        rotulo="Início"
        type="time"
        valor={horaInicio}
        aoMudar={setHoraInicio}
        exemplo={turno.inicio}
        disabled={enviando}
      />
      <CampoComExemplo
        rotulo="Fim"
        type="time"
        valor={horaFim}
        aoMudar={setHoraFim}
        exemplo={turno.fim}
        disabled={enviando}
      />

      <label className="flex flex-col gap-1.5">
        <span className="text-text-muted text-xs font-bold">Matéria (opcional)</span>
        <select
          value={materiaId}
          onChange={(evento) => setMateriaId(evento.target.value)}
          className="text-text w-full rounded-lg bg-transparent px-3 py-2 text-sm outline-none"
          style={{ border: "1px solid var(--border)" }}
          disabled={enviando}
        >
          <option value={SEM_MATERIA}>Sem matéria</option>
          {materias.map((materia) => (
            <option key={materia.id} value={materia.id}>
              {materia.nome}
            </option>
          ))}
        </select>
        {/* Previa da cor FORA do <select>: estilizar <option> nao funciona de
            forma confiavel entre navegadores (varios ignoram background no
            menu nativo), entao o grifo aparece aqui embaixo. */}
        {materiaEscolhida?.cor && (
          <span className="mt-0.5 text-[11px]">
            <EtiquetaMateria nome={materiaEscolhida.nome} cor={materiaEscolhida.cor} />
          </span>
        )}
      </label>

      {erro && (
        <p
          role="alert"
          className="rounded-lg px-3 py-2 text-xs font-semibold"
          style={{ background: "var(--danger-bg)", color: "var(--danger-fg)" }}
        >
          {erro}
        </p>
      )}

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={enviando}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-extrabold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-60"
          style={{ background: "var(--primary)" }}
        >
          {enviando && (
            <span
              aria-hidden
              className="h-3 w-3 animate-spin rounded-full border-2 border-white/40 border-t-white"
            />
          )}
          {enviando ? "Salvando..." : editando ? "Salvar" : "Adicionar"}
        </button>
        <button
          type="button"
          onClick={aoCancelar}
          disabled={enviando}
          className="text-text-body rounded-lg px-3 py-2 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-40"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
