"use client";

import { useState } from "react";

import { IconCadeado, IconFicha, IconLapis } from "@/components/ui/icons";
import type { AlunoAdmin, FichaDoAluno, TipoDeApoio } from "@/lib/types";

/**
 * Feature F8 — a ficha de apoio do aluno.
 *
 * POR QUE E' BOA
 * --------------
 * Hoje o professor descobre pelo boca a boca, ou nao descobre. Chega em marco
 * sem saber que tem um aluno com laudo na sala.
 *
 * OS LIMITES, QUE NAO SAO NEGOCIAVEIS
 * -----------------------------------
 * Laudo de saude e' DADO PESSOAL SENSIVEL (LGPD art. 5o, II) — categoria acima
 * do dado comum.
 *
 *   ve         professor da turma + coordenacao. So'. Nunca outro aluno,
 *              nunca exportavel.
 *   diario     nunca. O diario carrega so' presenca e conteudo.
 *   engajamento NUNCA cruzado. "Aluno TEA teve 40% de atencao" e' exatamente o
 *              uso que o PRODUCT.md (linha 123) proibe.
 *
 * Com esses limites, e' feature solida. Sem eles, e' passivo juridico.
 *
 * POR QUE A LISTA MOSTRA SO' QUEM TEM FICHA
 * -----------------------------------------
 * A lista completa da turma ja' existe em outro painel. Mostrar as duas lado a
 * lado exibiria quem tem e quem nao tem laudo na mesma tela — um mapa de
 * diagnostico da sala, que e' o oposto do que esta feature quer ser.
 *
 * Para CRIAR uma ficha, o professor escolhe o aluno num seletor: e' um ato
 * deliberado sobre uma pessoa, nao uma coluna a preencher numa planilha.
 */

/** Os rótulos que a tela mostra. A lista é fechada — o backend recusa o resto. */
const ROTULOS: Record<TipoDeApoio, string> = {
  tdah: "TDAH",
  tea: "TEA",
  dislexia: "Dislexia",
  discalculia: "Discalculia",
  deficiencia_visual: "Deficiência visual",
  deficiencia_auditiva: "Deficiência auditiva",
  deficiencia_fisica: "Deficiência física",
  altas_habilidades: "Altas habilidades",
  outro: "Outro",
};

const TIPOS = Object.keys(ROTULOS) as TipoDeApoio[];

const ESTILO_CARTAO = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  boxShadow: "var(--shadow-card)",
} as const;

const ESTILO_CAMPO = {
  background: "var(--surface-2)",
  border: "1px solid var(--border)",
  color: "var(--text)",
} as const;

type PainelFichasProps = {
  /** Alunos da turma — só para o seletor de "adicionar ficha". */
  alunos: AlunoAdmin[];
  /** Fichas já cadastradas, vindas do servidor. */
  fichasIniciais: FichaDoAluno[];
};

export function PainelFichas({ alunos, fichasIniciais }: PainelFichasProps) {
  const [fichas, setFichas] = useState(fichasIniciais);
  const [editando, setEditando] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const semFicha = alunos.filter(
    (aluno) => !fichas.some((ficha) => ficha.aluno_ra === aluno.ra),
  );

  function aoSalvar(ra: string, salva: FichaDoAluno | null) {
    setFichas((atuais) => {
      const semEste = atuais.filter((ficha) => ficha.aluno_ra !== ra);
      if (salva === null) return semEste;
      // Preserva o nome: a resposta do PUT não o traz, só a listagem da turma.
      const nome =
        atuais.find((ficha) => ficha.aluno_ra === ra)?.nome ??
        alunos.find((aluno) => aluno.ra === ra)?.nome;
      return [...semEste, { ...salva, nome }].sort((a, b) =>
        (a.nome ?? "").localeCompare(b.nome ?? ""),
      );
    });
    setEditando(null);
  }

  return (
    <section className="rounded-2xl p-5" style={ESTILO_CARTAO}>
      <div className="mb-1 flex items-center gap-2">
        <IconFicha size={16} className="opacity-60" />
        <h2
          className="text-[11px] font-semibold tracking-wide uppercase"
          style={{ color: "var(--text-muted)" }}
        >
          Fichas de apoio
        </h2>
      </div>

      <p
        className="text-[12.5px] leading-relaxed"
        style={{ color: "var(--text-body)" }}
      >
        De que apoio o aluno precisa e o que funciona com ele, para o professor
        saber antes da aula.
      </p>

      {/* O contrato de privacidade, dito antes de qualquer campo. Isto é dado
          sensível: quem vai preencher precisa saber quem lê e onde não vai
          parar, ANTES de digitar. */}
      <p
        className="mt-3 flex items-start gap-2 rounded-xl px-3.5 py-3 text-[12px] leading-relaxed"
        style={{ background: "var(--surface-2)", color: "var(--text-muted)" }}
      >
        <span className="mt-0.5 flex-none">
          <IconCadeado size={13} />
        </span>
        <span>
          Dado pessoal sensível. Só o professor da turma e a coordenação veem.
          Nunca vai para o diário de classe, nunca é cruzado com engajamento, e
          nenhum aluno vê a ficha de outro. Descreva o que funciona na prática —
          não histórico clínico.
        </span>
      </p>

      {erro && (
        <p className="mt-3 text-[12.5px]" style={{ color: "var(--danger-fg)" }}>
          {erro}
        </p>
      )}

      {/* --- As fichas cadastradas --- */}
      {fichas.length > 0 && (
        <ul className="mt-4 flex flex-col gap-2">
          {fichas.map((ficha) =>
            editando === ficha.aluno_ra ? (
              <li key={ficha.aluno_ra}>
                <FormularioFicha
                  ra={ficha.aluno_ra}
                  nome={ficha.nome ?? ficha.aluno_ra}
                  inicial={ficha}
                  aoSalvar={aoSalvar}
                  aoCancelar={() => setEditando(null)}
                  aoFalhar={setErro}
                />
              </li>
            ) : (
              <li
                key={ficha.aluno_ra}
                className="flex flex-wrap items-start gap-3 rounded-xl px-3.5 py-3"
                style={{ background: "var(--surface-2)" }}
              >
                <div className="min-w-0 flex-1">
                  <p
                    className="text-[13.5px] font-semibold"
                    style={{ color: "var(--text)" }}
                  >
                    {ficha.nome ?? ficha.aluno_ra}
                  </p>

                  {ficha.tipos_de_apoio.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {ficha.tipos_de_apoio.map((tipo) => (
                        <span
                          key={tipo}
                          className="rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold"
                          style={{
                            background: "var(--primary-soft)",
                            color: "var(--text-brand)",
                          }}
                        >
                          {ROTULOS[tipo]}
                        </span>
                      ))}
                    </div>
                  )}

                  {ficha.adaptacoes && (
                    <p
                      className="mt-2 text-[12.5px] leading-relaxed"
                      style={{ color: "var(--text-body)" }}
                    >
                      {ficha.adaptacoes}
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setEditando(ficha.aluno_ra)}
                  className="flex flex-none items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-semibold transition-transform hover:-translate-y-px"
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    color: "var(--text)",
                  }}
                >
                  <IconLapis size={12} />
                  Editar
                </button>
              </li>
            ),
          )}
        </ul>
      )}

      {/* --- Adicionar --- */}
      {editando === "novo" ? (
        <div className="mt-3">
          <SeletorDeAluno
            alunos={semFicha}
            aoSalvar={aoSalvar}
            aoCancelar={() => setEditando(null)}
            aoFalhar={setErro}
          />
        </div>
      ) : (
        semFicha.length > 0 && (
          <button
            type="button"
            onClick={() => {
              setEditando("novo");
              setErro(null);
            }}
            className="mt-4 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-opacity"
            style={{ background: "var(--primary)" }}
          >
            Adicionar ficha
          </button>
        )
      )}

      {fichas.length === 0 && semFicha.length === 0 && (
        <p
          className="mt-4 text-[12.5px]"
          style={{ color: "var(--text-muted)" }}
        >
          Esta turma ainda não tem alunos cadastrados.
        </p>
      )}
    </section>
  );
}

/** Escolhe de quem é a ficha nova, e então abre o formulário. */
function SeletorDeAluno({
  alunos,
  aoSalvar,
  aoCancelar,
  aoFalhar,
}: {
  alunos: AlunoAdmin[];
  aoSalvar: (ra: string, ficha: FichaDoAluno | null) => void;
  aoCancelar: () => void;
  aoFalhar: (erro: string | null) => void;
}) {
  const [ra, setRa] = useState("");

  if (ra) {
    const aluno = alunos.find((item) => item.ra === ra);
    return (
      <FormularioFicha
        ra={ra}
        nome={aluno?.nome ?? ra}
        inicial={null}
        aoSalvar={aoSalvar}
        aoCancelar={aoCancelar}
        aoFalhar={aoFalhar}
      />
    );
  }

  return (
    <div
      className="flex flex-wrap items-end gap-3 rounded-xl px-3.5 py-3"
      style={{ background: "var(--surface-2)" }}
    >
      <label className="flex min-w-[200px] flex-1 flex-col gap-1.5">
        <span
          className="text-[11px] font-semibold tracking-wide uppercase"
          style={{ color: "var(--text-muted)" }}
        >
          De quem é a ficha
        </span>
        <select
          value={ra}
          onChange={(evento) => setRa(evento.target.value)}
          className="cursor-pointer rounded-xl px-3 py-2.5 text-sm font-semibold"
          style={{ ...ESTILO_CAMPO, background: "var(--surface)" }}
        >
          <option value="">Escolher aluno…</option>
          {alunos.map((aluno) => (
            <option key={aluno.ra} value={aluno.ra}>
              {aluno.nome}
            </option>
          ))}
        </select>
      </label>

      <button
        type="button"
        onClick={aoCancelar}
        className="rounded-xl px-4 py-2.5 text-sm font-semibold"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          color: "var(--text)",
        }}
      >
        Cancelar
      </button>
    </div>
  );
}

/** Criar ou editar UMA ficha. */
function FormularioFicha({
  ra,
  nome,
  inicial,
  aoSalvar,
  aoCancelar,
  aoFalhar,
}: {
  ra: string;
  nome: string;
  inicial: FichaDoAluno | null;
  aoSalvar: (ra: string, ficha: FichaDoAluno | null) => void;
  aoCancelar: () => void;
  aoFalhar: (erro: string | null) => void;
}) {
  const [tipos, setTipos] = useState<TipoDeApoio[]>(
    inicial?.tipos_de_apoio ?? [],
  );
  const [adaptacoes, setAdaptacoes] = useState(inicial?.adaptacoes ?? "");
  const [salvando, setSalvando] = useState(false);

  function alternar(tipo: TipoDeApoio) {
    setTipos((atuais) =>
      atuais.includes(tipo)
        ? atuais.filter((item) => item !== tipo)
        : [...atuais, tipo],
    );
  }

  async function salvar() {
    setSalvando(true);
    aoFalhar(null);
    try {
      const resposta = await fetch(
        `/api/admin/alunos/${encodeURIComponent(ra)}/ficha`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tipos_de_apoio: tipos, adaptacoes }),
        },
      );
      const dados = await resposta.json();

      if (!resposta.ok) {
        // A mensagem vem da ponte, que já traduziu o status.
        aoFalhar(dados?.erro ?? "Não foi possível salvar a ficha.");
        return;
      }

      // Os dois campos vazios apagam a ficha — o backend devolve
      // `tem_ficha: false`, e a lista precisa refletir a remoção.
      aoSalvar(ra, dados.tem_ficha ? (dados as FichaDoAluno) : null);
    } catch {
      aoFalhar("Não foi possível falar com o servidor.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div
      className="rounded-xl px-3.5 py-3"
      style={{ background: "var(--surface-2)" }}
    >
      <p
        className="text-[13.5px] font-semibold"
        style={{ color: "var(--text)" }}
      >
        {nome}
      </p>

      <fieldset className="mt-3">
        <legend
          className="mb-2 text-[11px] font-semibold tracking-wide uppercase"
          style={{ color: "var(--text-muted)" }}
        >
          Tipo de apoio
        </legend>
        <div className="flex flex-wrap gap-1.5">
          {TIPOS.map((tipo) => {
            const ativo = tipos.includes(tipo);
            return (
              <button
                key={tipo}
                type="button"
                aria-pressed={ativo}
                onClick={() => alternar(tipo)}
                className="rounded-full px-3 py-1 text-[12px] font-semibold transition-transform hover:-translate-y-px"
                style={{
                  background: ativo
                    ? "var(--primary-soft)"
                    : "var(--surface)",
                  border: `1px solid ${ativo ? "var(--primary)" : "var(--border)"}`,
                  color: ativo ? "var(--text-brand)" : "var(--text-muted)",
                }}
              >
                {ROTULOS[tipo]}
              </button>
            );
          })}
        </div>
      </fieldset>

      <label className="mt-4 flex flex-col gap-1.5">
        <span
          className="text-[11px] font-semibold tracking-wide uppercase"
          style={{ color: "var(--text-muted)" }}
        >
          O que funciona com ele
        </span>
        <textarea
          value={adaptacoes}
          onChange={(evento) => setAdaptacoes(evento.target.value)}
          rows={3}
          maxLength={2000}
          placeholder="Senta na frente. Prova em duas partes. Precisa do enunciado lido em voz alta."
          className="resize-y rounded-xl px-3 py-2.5 text-[13px] leading-relaxed"
          style={{ ...ESTILO_CAMPO, background: "var(--surface)" }}
        />
        <span className="text-[12px]" style={{ color: "var(--text-muted)" }}>
          O que ajuda na prática, na sala de aula. Não histórico clínico.
        </span>
      </label>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={salvar}
          disabled={salvando}
          className="rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-opacity disabled:opacity-50"
          style={{ background: "var(--primary)" }}
        >
          {salvando ? "Salvando…" : "Salvar ficha"}
        </button>

        <button
          type="button"
          onClick={aoCancelar}
          className="rounded-xl px-4 py-2.5 text-sm font-semibold"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            color: "var(--text)",
          }}
        >
          Cancelar
        </button>

        {/* Limpar os dois campos apaga a ficha. Dito aqui porque é a única
            forma de remoção na tela, e um professor que quer apagar precisa
            saber como — sem isso ele deixaria uma ficha vazia no lugar. */}
        {inicial && (
          <span className="text-[12px]" style={{ color: "var(--text-muted)" }}>
            Limpe os dois campos e salve para apagar a ficha.
          </span>
        )}
      </div>
    </div>
  );
}
