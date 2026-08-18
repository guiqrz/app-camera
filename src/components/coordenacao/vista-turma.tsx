"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { GradeSemanal } from "@/components/coordenacao/grade-semanal";
import { CampoComExemplo } from "@/components/ui/campo-com-exemplo";
import { IconRelogio } from "@/components/ui/icons";
import type { Aula, Materia, NovaAula, NovaTurma, TurmaAdmin } from "@/lib/types";
import { deduzirTurno, TURNOS, turnoPorId, TURNO_PADRAO } from "@/lib/turnos";

type VistaTurmaProps = {
  /** Turma vinda do servidor no carregamento da pagina. */
  turmaInicial: TurmaAdmin;
};

/** Corpo de erro comum aos proxies /api/admin/*. Mesmo shape da vista de admin. */
type CorpoErro = {
  erro?: string;
  detalhe?: { detail?: string | { nome?: string } };
} | null;

/**
 * Pagina de uma turma — dados da turma no topo, grade semanal abaixo.
 *
 * Substitui o antigo `ModalTurma` no modo editar. Virou pagina porque montar a
 * grade da semana e' um trabalho longo, com varias idas e vindas: num modal o
 * coordenador perderia o contexto a cada aula cadastrada, e a grade em colunas
 * simplesmente nao cabe num card centrado.
 *
 * Turma e aulas sao salvas separadamente e de proposito: sao recursos
 * diferentes na API (`PUT /admin/turmas/{id}` e `.../aulas`), e cada aula ja'
 * salva sozinha ao ser criada. Nao ha "salvar tudo" — o botao do topo grava
 * so' nome e sala.
 */
export function VistaTurma({ turmaInicial }: VistaTurmaProps) {
  const [turma, setTurma] = useState(turmaInicial);
  const [nome, setNome] = useState(turmaInicial.nome);
  const [salaId, setSalaId] = useState(turmaInicial.sala_id);
  const [erroTurma, setErroTurma] = useState<string | null>(null);
  const [salvandoTurma, setSalvandoTurma] = useState(false);
  const [turmaSalva, setTurmaSalva] = useState(false);

  const [aulas, setAulas] = useState<Aula[]>([]);
  const [carregandoAulas, setCarregandoAulas] = useState(true);
  const [erroAulas, setErroAulas] = useState<string | null>(null);

  const [materias, setMaterias] = useState<Materia[]>([]);

  // Turno escolhido na mao. Nulo = seguir o que as aulas dizem. So' afeta o
  // texto de recomendacao e o exemplo que o Tab preenche — nunca valida nada.
  const [turnoEscolhido, setTurnoEscolhido] = useState<string | null>(null);

  const turnoDeduzido = useMemo(
    () => deduzirTurno(aulas.map((aula) => aula.hora_inicio)),
    [aulas],
  );
  const turno = turnoEscolhido
    ? turnoPorId(turnoEscolhido)
    : (turnoDeduzido ?? TURNO_PADRAO);

  // Mesmo padrao das outras telas: releituras podem cruzar, e so' a mais
  // recente pode escrever no estado.
  const requisicaoAulasRef = useRef(0);

  /**
   * Busca as aulas da turma e substitui a grade local.
   *
   * `silencioso` (usado depois de um CRUD) troca a mensagem de erro pra deixar
   * claro que a acao VALEU e so' a releitura falhou — sem isso o usuario acha
   * que nao salvou e tenta de novo.
   */
  const recarregarAulas = useCallback(
    async (silencioso = false) => {
      const sequencia = ++requisicaoAulasRef.current;
      setCarregandoAulas(true);
      try {
        const resposta = await fetch(`/api/admin/turmas/${turma.id}/aulas`, {
          cache: "no-store",
        });
        if (sequencia !== requisicaoAulasRef.current) return;

        if (!resposta.ok) {
          const corpo = (await resposta.json().catch(() => null)) as CorpoErro;
          setErroAulas(
            silencioso
              ? "Salvo, mas não foi possível atualizar a grade — recarregue a página."
              : (corpo?.erro ?? "Não foi possível carregar as aulas desta turma."),
          );
          return;
        }

        setAulas((await resposta.json()) as Aula[]);
        setErroAulas(null);
      } catch (causa) {
        if (sequencia !== requisicaoAulasRef.current) return;
        console.error("[cupcam] falha ao carregar aulas da turma:", causa);
        setErroAulas(
          silencioso
            ? "Salvo, mas não foi possível atualizar a grade — recarregue a página."
            : "Não foi possível carregar as aulas desta turma.",
        );
      } finally {
        if (sequencia === requisicaoAulasRef.current) setCarregandoAulas(false);
      }
    },
    [turma.id],
  );

  // setTimeout(0) em vez de chamar direto no corpo do efeito: o lint
  // (react-hooks/set-state-in-effect) le o setState sincrono do inicio da
  // funcao como recalculo derivavel do render, mas ler a grade da API e'
  // conversa com um sistema externo. O timeout zero deixa isso explicito sem
  // atrasar a busca na pratica.
  useEffect(() => {
    const id = setTimeout(() => void recarregarAulas(), 0);
    return () => clearTimeout(id);
  }, [recarregarAulas]);

  // Materias sao globais e so' alimentam o dropdown do formulario de aula.
  // Falhar aqui nao trava a tela: o dropdown fica so' com "Sem matéria", que
  // continua sendo uma aula valida — por isso nao ha estado de erro pra elas.
  useEffect(() => {
    const id = setTimeout(() => {
      void (async () => {
        try {
          const resposta = await fetch("/api/admin/materias", { cache: "no-store" });
          if (!resposta.ok) return;
          setMaterias((await resposta.json()) as Materia[]);
        } catch (causa) {
          console.error("[cupcam] falha ao carregar materias:", causa);
        }
      })();
    }, 0);
    return () => clearTimeout(id);
  }, []);

  /* --- Dados da turma: nome + sala --- */
  async function aoSalvarTurma(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setTurmaSalva(false);

    if (!nome.trim() || !salaId.trim()) {
      setErroTurma("Preencha o nome e a sala.");
      return;
    }
    setErroTurma(null);

    const dados: NovaTurma = { nome: nome.trim(), sala_id: salaId.trim() };

    setSalvandoTurma(true);
    try {
      const resposta = await fetch(`/api/admin/turmas/${turma.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dados),
      });

      if (!resposta.ok) {
        const corpo = (await resposta.json().catch(() => null)) as CorpoErro;
        const detail = corpo?.detalhe?.detail;
        setErroTurma(
          (typeof detail === "string" ? detail : undefined) ??
            corpo?.erro ??
            "Não foi possível salvar a turma.",
        );
        return;
      }

      // Reflete o que foi gravado (com trim) no cabecalho da pagina.
      setTurma((atual) => ({ ...atual, ...dados }));
      setNome(dados.nome);
      setSalaId(dados.sala_id);
      setTurmaSalva(true);
    } catch (causa) {
      console.error("[cupcam] falha ao salvar turma:", causa);
      setErroTurma("Não foi possível salvar a turma.");
    } finally {
      setSalvandoTurma(false);
    }
  }

  /* --- Aulas --- */
  const aoCriarAula = useCallback(
    async (dados: NovaAula) => {
      const resposta = await fetch(`/api/admin/turmas/${turma.id}/aulas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dados),
      });
      if (!resposta.ok) throw new Error(await mensagemDeErroDeAula(resposta, "criar"));
      await recarregarAulas(true);
    },
    [turma.id, recarregarAulas],
  );

  const aoSalvarAula = useCallback(
    async (aula: Aula, dados: NovaAula) => {
      const resposta = await fetch(`/api/admin/aulas/${aula.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dados),
      });
      if (!resposta.ok) throw new Error(await mensagemDeErroDeAula(resposta, "salvar"));
      await recarregarAulas(true);
    },
    [recarregarAulas],
  );

  /**
   * Exclui a aula direto (a grade ja' confirmou inline).
   *
   * Sem formulario pra mostrar o erro, a falha vira a mensagem da propria
   * grade. Mesmo no 404 vale reler antes de avisar: a aula pode ter sido
   * excluida em outra aba. A recarga limpa `erroAulas` no sucesso, entao o
   * aviso vem DEPOIS dela — senao a mensagem sumiria sozinha.
   */
  const aoExcluirAula = useCallback(
    async (aula: Aula) => {
      try {
        const resposta = await fetch(`/api/admin/aulas/${aula.id}`, { method: "DELETE" });
        if (!resposta.ok) {
          const corpo = (await resposta.json().catch(() => null)) as CorpoErro;
          await recarregarAulas(true);
          setErroAulas(corpo?.erro ?? "Não foi possível excluir a aula.");
          return;
        }
        await recarregarAulas(true);
      } catch (causa) {
        console.error("[cupcam] falha ao excluir aula:", causa);
        setErroAulas("Não foi possível excluir a aula.");
      }
    },
    [recarregarAulas],
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Identificacao da turma.
          O titulo da pagina ja' e' o `h1` do cabecalho (AppShell), entao aqui
          nao ha' um segundo `h1`: dois `h1` na mesma pagina confundem leitor
          de tela sobre qual e' o titulo de verdade.

          Os 3 atalhos que ficavam a direita ("Ver aulas", "Relatorio da
          turma", "Fazer chamada") sairam a pedido dele em 16/08. Eram
          navegacao pra outras telas competindo com o topo da pagina — o menu
          lateral ja' leva a todas elas. */}
      <div className="turma-cabecalho">
        <p className="turma-identificacao">
          Sala {turma.sala_id} · {turma.total_alunos}{" "}
          {turma.total_alunos === 1 ? "aluno matriculado" : "alunos matriculados"}
        </p>
      </div>

      {/* Dados da turma. */}
      <form onSubmit={aoSalvarTurma} noValidate className="coord-painel turma-form">
        <h2 className="coord-painel-titulo">Dados da turma</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <CampoComExemplo
            rotulo="Nome da turma"
            valor={nome}
            aoMudar={(valor) => {
              setNome(valor);
              setTurmaSalva(false);
            }}
            exemplo="Turma 8A"
            disabled={salvandoTurma}
          />
          <CampoComExemplo
            rotulo="Sala"
            valor={salaId}
            aoMudar={(valor) => {
              setSalaId(valor);
              setTurmaSalva(false);
            }}
            exemplo="sala_32A"
            disabled={salvandoTurma}
          />
        </div>

        {erroTurma && (
          <p
            role="alert"
            className="rounded-xl px-4 py-3 text-sm font-semibold"
            style={{ background: "var(--danger-bg)", color: "var(--danger-fg)" }}
          >
            {erroTurma}
          </p>
        )}

        <div className="flex items-center justify-end gap-3">
          {turmaSalva && (
            <span
              role="status"
              className="text-xs font-semibold"
              style={{ color: "var(--ok-fg)" }}
            >
              Alterações salvas.
            </span>
          )}
          {/* `.forte` (tinta cheia), nao `.vidro`: e' a acao que GRAVA, e a
              unica desta faixa — merece o peso. Os atalhos do topo e o "Ver
              turma" da grade sao navegacao, e por isso ficam de vidro. */}
          <button type="submit" disabled={salvandoTurma} className="btn-acao forte centrado">
            {salvandoTurma && (
              <span
                aria-hidden
                className="h-3.5 w-3.5 animate-spin rounded-full border-2"
                style={{
                  borderColor: "color-mix(in srgb, currentColor 35%, transparent)",
                  borderTopColor: "currentColor",
                }}
              />
            )}
            {salvandoTurma ? "Salvando..." : "Salvar alterações"}
          </button>
        </div>
      </form>

      {/* Horario de referencia: recomendacao, nunca limite. Alimenta tambem o
          exemplo que a tecla Tab preenche nos campos de horario da grade. */}
      <div className="turma-turno">
        <span className="turma-turno-icone" aria-hidden>
          <IconRelogio size={16} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="turma-turno-titulo">
            Turno da {turno.nome.toLowerCase()}: as aulas vão de {turno.inicio} às{" "}
            {turno.fim}.
          </p>
          <p className="turma-turno-apoio">
            É só uma referência — você pode cadastrar qualquer horário.
          </p>
        </div>

        {/* Seletor de turno: a deducao pelas aulas acerta na maioria dos casos,
            mas turma nova nao tem aula nenhuma pra deduzir, e o coordenador
            precisa poder corrigir sem depender do palpite.

            Mesmas pilulas dos filtros da Chamada (`.chamada-filtro`): sao a
            mesma interacao — um grupo onde exatamente um esta valendo — e nao
            havia motivo pra inventar um segundo desenho pra isso. */}
        <div className="chamada-filtros" role="group" aria-label="Turno de referência">
          {TURNOS.map((opcao) => (
            <button
              key={opcao.id}
              type="button"
              onClick={() => setTurnoEscolhido(opcao.id)}
              aria-pressed={opcao.id === turno.id}
              className="chamada-filtro"
            >
              {opcao.nome}
            </button>
          ))}
        </div>
      </div>

      <GradeSemanal
        aulas={aulas}
        materias={materias}
        turno={turno}
        carregando={carregandoAulas}
        erro={erroAulas}
        aoCriarAula={aoCriarAula}
        aoSalvarAula={aoSalvarAula}
        aoExcluirAula={aoExcluirAula}
      />
    </div>
  );
}

/**
 * Extrai a mensagem de erro de um POST/PUT de aula.
 *
 * No 409 o `detalhe` e' {detail: {nome}} com a turma que ja' ocupa a sala
 * nesse horario; no 422 e' {detail: "mensagem"} (horario invalido, fim antes
 * do inicio, materia inexistente).
 */
async function mensagemDeErroDeAula(
  resposta: Response,
  acao: "criar" | "salvar",
): Promise<string> {
  const corpo = (await resposta.json().catch(() => null)) as CorpoErro;
  const detail = corpo?.detalhe?.detail;

  if (resposta.status === 409 && typeof detail === "object" && detail?.nome) {
    return `Conflito de horário com a turma "${detail.nome}".`;
  }
  return (
    (typeof detail === "string" ? detail : undefined) ??
    corpo?.erro ??
    `Não foi possível ${acao} a aula.`
  );
}
