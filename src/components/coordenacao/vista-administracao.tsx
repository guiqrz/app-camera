"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ModalAluno } from "@/components/coordenacao/modal-aluno";
import { ModalAula } from "@/components/coordenacao/modal-aula";
import { ModalConfirmarExclusao } from "@/components/coordenacao/modal-confirmar-exclusao";
import {
  ModalConfirmarExclusaoTurma,
  type BloqueioTurma,
} from "@/components/coordenacao/modal-confirmar-exclusao-turma";
import { ModalMateria } from "@/components/coordenacao/modal-materia";
import { ModalTurma } from "@/components/coordenacao/modal-turma";
import { PainelAlunos } from "@/components/coordenacao/painel-alunos";
import { PainelAulas } from "@/components/coordenacao/painel-aulas";
import { PainelMaterias } from "@/components/coordenacao/painel-materias";
import { PainelTurmas } from "@/components/coordenacao/painel-turmas";
import { IconPessoas, IconTendencia, IconTurma } from "@/components/ui/icons";
import { StatCard } from "@/components/ui/stat-card";
import type {
  AlunoAdmin,
  Aula,
  Materia,
  NovaAula,
  NovaMateria,
  NovaTurma,
  TurmaAdmin,
  VisaoAdmin,
} from "@/lib/types";

type VistaAdministracaoProps = {
  /** Retrato inicial vindo do servidor no carregamento da pagina. */
  visaoInicial: VisaoAdmin;
};

/** Estado dos modais — modo mais o item sendo editado. */
type EstadoModalAluno = { modo: "criar" | "editar"; aluno?: AlunoAdmin };
type EstadoModalTurma = { modo: "criar" | "editar"; turma?: TurmaAdmin };
type EstadoModalAula = { modo: "criar" | "editar"; aula?: Aula };
type EstadoModalMateria = { modo: "criar" | "editar"; materia?: Materia };

/**
 * Corpo de erro comum aos proxies /api/admin/*: {erro, detalhe?}, onde
 * `detalhe` e' o corpo cru do FastAPI. No 422 `detail` e' string; no 409 e' um
 * objeto cujos campos variam por rota (`nome` da turma em conflito de horario,
 * `total_aulas` na materia em uso).
 */
type CorpoErro = {
  erro?: string;
  detalhe?: { detail?: string | { nome?: string; total_aulas?: number } };
} | null;

/**
 * Vista interativa da tela "Administracao".
 *
 * CRUD completo de turmas, alunos e das aulas da turma selecionada. Cada
 * entidade usa o mesmo modal pra criar e editar (o `modo` decide POST vs.
 * PUT). Exclusao de aluno e de turma usa modais de confirmacao com 409
 * tratado: aluno com historico de presenca entra num 2o estagio; turma com
 * alunos entra num estado bloqueado. Aula nao tem 409 na exclusao — o
 * `PainelAulas` confirma inline.
 *
 * Os filhos (PainelTurmas/PainelAlunos/PainelAulas) sao "burros": so' recebem
 * dados e callbacks, a decisao fica toda aqui.
 */
export function VistaAdministracao({ visaoInicial }: VistaAdministracaoProps) {
  const [visao, setVisao] = useState<VisaoAdmin>(visaoInicial);
  const [selecionadaId, setSelecionadaId] = useState<number | null>(
    visaoInicial.turmas[0]?.id ?? null,
  );
  const [modalAluno, setModalAluno] = useState<EstadoModalAluno | null>(null);
  const [modalTurma, setModalTurma] = useState<EstadoModalTurma | null>(null);
  const [modalAula, setModalAula] = useState<EstadoModalAula | null>(null);
  const [modalMateria, setModalMateria] = useState<EstadoModalMateria | null>(null);
  const [alunoParaExcluir, setAlunoParaExcluir] = useState<AlunoAdmin | null>(null);
  const [turmaParaExcluir, setTurmaParaExcluir] = useState<TurmaAdmin | null>(null);

  // Materias e aulas nao vem no retrato inicial do servidor — sao buscadas no
  // cliente pelos proxies /api/admin/*, que carregam a X-API-Key no servidor
  // (componente "use client" nunca fala com lib/api.ts direto).
  const [materias, setMaterias] = useState<Materia[]>([]);
  const [carregandoMaterias, setCarregandoMaterias] = useState(true);
  const [erroMaterias, setErroMaterias] = useState<string | null>(null);
  const [aulas, setAulas] = useState<Aula[]>([]);
  const [carregandoAulas, setCarregandoAulas] = useState(false);
  const [erroAulas, setErroAulas] = useState<string | null>(null);
  // Aviso quando a mutacao (POST/PUT/DELETE) deu certo mas a recarga da visao
  // (GET) falhou depois — sem isso o modal fecha "com sucesso" e a lista fica
  // desatualizada, e o usuario pode achar que a acao nao valeu e repeti-la.
  const [avisoRecarga, setAvisoRecarga] = useState<string | null>(null);

  // Cache-buster da miniatura. A URL da foto e' constante por RA e a ponte responde
  // com Cache-Control: max-age=30, entao trocar a foto de um aluno mostraria a antiga
  // por ate' 30s. Cada recarga bem-sucedida incrementa isto, mudando a URL do <img>.
  const [versaoFotos, setVersaoFotos] = useState(0);

  /** Busca o retrato mais recente da API e substitui o estado local. */
  const recarregar = useCallback(async () => {
    try {
      const resposta = await fetch("/api/admin/visao", { cache: "no-store" });
      if (!resposta.ok) {
        setAvisoRecarga(
          "Salvo, mas não foi possível atualizar a lista — recarregue a página.",
        );
        return;
      }
      const dados = (await resposta.json()) as VisaoAdmin;
      setVisao(dados);
      // Mantem a selecao se a turma ainda existir; senao cai na primeira.
      setSelecionadaId((atual) => {
        if (atual !== null && dados.turmas.some((turma) => turma.id === atual)) {
          return atual;
        }
        return dados.turmas[0]?.id ?? null;
      });
      setVersaoFotos((atual) => atual + 1);
      setAvisoRecarga(null);
    } catch (causa) {
      console.error("[cupcam] falha ao recarregar visao admin:", causa);
      setAvisoRecarga(
        "Salvo, mas não foi possível atualizar a lista — recarregue a página.",
      );
    }
  }, []);

  // Contador de requisicoes de aulas. Trocar de turma rapido dispara varios
  // GETs em paralelo, e a resposta que chega por ultimo pode ser a de uma
  // turma que ja nao esta selecionada — so' a requisicao mais recente pode
  // escrever no estado.
  const requisicaoAulasRef = useRef(0);

  /**
   * Busca as aulas de uma turma e substitui a grade local. `turmaId` nulo
   * (nenhuma turma selecionada) so' esvazia a grade, sem ir na rede.
   *
   * `silencioso` (usado depois de um CRUD de aula) troca a mensagem de erro
   * pra deixar claro que a acao VALEU e so' a releitura falhou — sem isso o
   * usuario acha que nao salvou e tenta de novo.
   */
  const recarregarAulas = useCallback(async (turmaId: number | null, silencioso = false) => {
    // Incrementar sempre — inclusive no caso nulo — invalida qualquer resposta
    // de uma turma anterior que ainda esteja em voo.
    const sequencia = ++requisicaoAulasRef.current;
    if (turmaId === null) {
      setAulas([]);
      setErroAulas(null);
      setCarregandoAulas(false);
      return;
    }

    setCarregandoAulas(true);
    try {
      const resposta = await fetch(`/api/admin/turmas/${turmaId}/aulas`, {
        cache: "no-store",
      });
      // Resposta obsoleta (o usuario ja trocou de turma): descarta inteira,
      // sem tocar em lista, erro nem no estado de carregamento.
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
  }, []);

  // Recarrega a grade sempre que a turma selecionada muda.
  //
  // setTimeout(0) em vez de chamar recarregarAulas() direto no corpo do efeito
  // — mesmo motivo do CardAoVivo: o lint (react-hooks/set-state-in-effect) le
  // o setState sincrono do inicio da funcao como recalculo derivavel do
  // render, mas ler a grade da API e' conversa com um sistema externo. O
  // timeout zero deixa isso explicito sem atrasar a busca na pratica, e o
  // clear cancela a busca de uma turma que o usuario ja abandonou.
  useEffect(() => {
    const id = setTimeout(() => void recarregarAulas(selecionadaId), 0);
    return () => clearTimeout(id);
  }, [selecionadaId, recarregarAulas]);

  // Mesmo papel do contador de aulas: o CRUD de materia dispara uma releitura
  // que pode cruzar com outra ja em voo — so' a mais recente escreve no estado.
  const requisicaoMateriasRef = useRef(0);

  /**
   * Busca a lista global de materias e substitui o estado local.
   *
   * Materia nao depende da turma selecionada, mas a lista alimenta DOIS
   * lugares: o painel de materias e o dropdown do `ModalAula`. Por isso todo
   * CRUD de materia chama isto — sem a releitura, o dropdown continuaria
   * oferecendo uma materia que acabou de ser excluida.
   *
   * `silencioso` (usado depois de um CRUD) troca a mensagem de erro pra deixar
   * claro que a acao VALEU e so' a releitura falhou.
   */
  const recarregarMaterias = useCallback(async (silencioso = false) => {
    const sequencia = ++requisicaoMateriasRef.current;
    setCarregandoMaterias(true);
    try {
      const resposta = await fetch("/api/admin/materias", { cache: "no-store" });
      // Resposta obsoleta: descarta inteira, sem tocar em lista nem em erro.
      if (sequencia !== requisicaoMateriasRef.current) return;

      if (!resposta.ok) {
        const corpo = (await resposta.json().catch(() => null)) as CorpoErro;
        setErroMaterias(
          silencioso
            ? "Salvo, mas não foi possível atualizar a lista de matérias — recarregue a página."
            : (corpo?.erro ?? "Não foi possível carregar as matérias."),
        );
        return;
      }

      setMaterias((await resposta.json()) as Materia[]);
      setErroMaterias(null);
    } catch (causa) {
      if (sequencia !== requisicaoMateriasRef.current) return;
      console.error("[cupcam] falha ao carregar materias:", causa);
      setErroMaterias(
        silencioso
          ? "Salvo, mas não foi possível atualizar a lista de matérias — recarregue a página."
          : "Não foi possível carregar as matérias.",
      );
    } finally {
      if (sequencia === requisicaoMateriasRef.current) setCarregandoMaterias(false);
    }
  }, []);

  // Materias sao globais (nao dependem da turma) — busca uma vez ao montar.
  // Falhar aqui nao trava a tela: o dropdown do ModalAula fica so' com "Sem
  // matéria", que continua sendo uma aula valida.
  //
  // setTimeout(0) pelo mesmo motivo do efeito das aulas acima.
  useEffect(() => {
    const id = setTimeout(() => void recarregarMaterias(), 0);
    return () => clearTimeout(id);
  }, [recarregarMaterias]);

  const turmaSelecionada = useMemo(
    () => visao.turmas.find((turma) => turma.id === selecionadaId) ?? null,
    [visao.turmas, selecionadaId],
  );

  const alunosDaTurma = useMemo(
    () =>
      turmaSelecionada
        ? visao.alunos.filter((aluno) => aluno.turma_id === turmaSelecionada.id)
        : [],
    [visao.alunos, turmaSelecionada],
  );

  const mediaPorTurma =
    visao.totais.turmas > 0
      ? Math.round(visao.totais.alunos / visao.totais.turmas)
      : null;

  /* --- Turma: criar/editar pelo mesmo modal --- */
  const aoNovaTurma = useCallback(() => setModalTurma({ modo: "criar" }), []);
  const aoEditarTurma = useCallback(
    (turma: TurmaAdmin) => setModalTurma({ modo: "editar", turma }),
    [],
  );

  const aoSalvarTurma = useCallback(
    async (dados: NovaTurma) => {
      if (!modalTurma) return;
      const editando = modalTurma.modo === "editar";
      const url = editando
        ? `/api/admin/turmas/${modalTurma.turma!.id}`
        : "/api/admin/turmas";

      const resposta = await fetch(url, {
        method: editando ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dados),
      });

      if (!resposta.ok) {
        // Shape de erro das rotas de turma: {erro, detalhe?}. `detalhe` e' o
        // corpo cru do FastAPI, {detail: "mensagem"} no 422 de validacao.
        // Criar/editar turma nao da mais 409: turma virou so' nome + sala, e
        // conflito de horario agora e' entre AULAS. (O 409 do DELETE de turma
        // continua existindo — turma com alunos — e e' tratado em
        // `aoConfirmarExclusaoTurma`.)
        const corpo = (await resposta.json().catch(() => null)) as CorpoErro;
        const detail = corpo?.detalhe?.detail;
        const mensagem =
          (typeof detail === "string" ? detail : undefined) ??
          corpo?.erro ??
          `Não foi possível ${editando ? "salvar" : "criar"} a turma.`;
        throw new Error(mensagem);
      }

      setModalTurma(null);
      await recarregar();
    },
    [modalTurma, recarregar],
  );

  /* --- Aula: criar/editar pelo mesmo modal, dentro da turma selecionada --- */
  const aoNovaAula = useCallback(() => setModalAula({ modo: "criar" }), []);
  const aoEditarAula = useCallback(
    (aula: Aula) => setModalAula({ modo: "editar", aula }),
    [],
  );

  const aoSalvarAula = useCallback(
    async (dados: NovaAula) => {
      if (!modalAula || !turmaSelecionada) return;
      const editando = modalAula.modo === "editar";
      const url = editando
        ? `/api/admin/aulas/${modalAula.aula!.id}`
        : `/api/admin/turmas/${turmaSelecionada.id}/aulas`;

      const resposta = await fetch(url, {
        method: editando ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dados),
      });

      if (!resposta.ok) {
        // {erro, detalhe?}: no 409 o `detalhe` e' {detail: {nome}} com a turma
        // que ja ocupa a sala nesse horario; no 422 e' {detail: "mensagem"}
        // (horario invalido, fim antes do inicio, materia inexistente).
        const corpo = (await resposta.json().catch(() => null)) as CorpoErro;
        const detail = corpo?.detalhe?.detail;
        if (resposta.status === 409 && typeof detail === "object" && detail?.nome) {
          throw new Error(`Conflito de horário com a turma "${detail.nome}".`);
        }
        const mensagem =
          (typeof detail === "string" ? detail : undefined) ??
          corpo?.erro ??
          `Não foi possível ${editando ? "salvar" : "criar"} a aula.`;
        throw new Error(mensagem);
      }

      setModalAula(null);
      await recarregarAulas(turmaSelecionada.id, true);
    },
    [modalAula, turmaSelecionada, recarregarAulas],
  );

  /**
   * Exclui a aula direto (o `PainelAulas` ja confirmou inline).
   *
   * Diferente das outras exclusoes, nao ha modal pra mostrar o erro — entao a
   * falha vira a mensagem do proprio painel, no lugar do erro de carregamento.
   */
  const aoExcluirAula = useCallback(
    async (aula: Aula) => {
      try {
        const resposta = await fetch(`/api/admin/aulas/${aula.id}`, { method: "DELETE" });
        if (!resposta.ok) {
          const corpo = (await resposta.json().catch(() => null)) as CorpoErro;
          // Mesmo no 404 vale reler antes de avisar: a aula pode ter sido
          // excluida em outra aba e a grade local ficou desatualizada. A
          // recarga limpa `erroAulas` no sucesso, entao o aviso vem DEPOIS
          // dela — senao a mensagem sumiria sozinha.
          if (turmaSelecionada) await recarregarAulas(turmaSelecionada.id, true);
          setErroAulas(corpo?.erro ?? "Não foi possível excluir a aula.");
          return;
        }
        if (turmaSelecionada) await recarregarAulas(turmaSelecionada.id, true);
      } catch (causa) {
        console.error("[cupcam] falha ao excluir aula:", causa);
        setErroAulas("Não foi possível excluir a aula.");
      }
    },
    [turmaSelecionada, recarregarAulas],
  );

  /* --- Materia: catalogo global, criar/renomear pelo mesmo modal --- */
  const aoNovaMateria = useCallback(() => setModalMateria({ modo: "criar" }), []);
  const aoEditarMateria = useCallback(
    (materia: Materia) => setModalMateria({ modo: "editar", materia }),
    [],
  );

  const aoSalvarMateria = useCallback(
    async (dados: NovaMateria) => {
      if (!modalMateria) return;
      const editando = modalMateria.modo === "editar";
      const url = editando
        ? `/api/admin/materias/${modalMateria.materia!.id}`
        : "/api/admin/materias";

      const resposta = await fetch(url, {
        method: editando ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dados),
      });

      if (!resposta.ok) {
        // {erro, detalhe?}: no 422 (nome vazio ou ja cadastrado) o `detalhe` e'
        // {detail: "mensagem"}. Criar/renomear materia nao tem 409.
        const corpo = (await resposta.json().catch(() => null)) as CorpoErro;
        const detail = corpo?.detalhe?.detail;
        const mensagem =
          (typeof detail === "string" ? detail : undefined) ??
          corpo?.erro ??
          `Não foi possível ${editando ? "renomear" : "criar"} a matéria.`;
        throw new Error(mensagem);
      }

      setModalMateria(null);
      await recarregarMaterias(true);
      // Renomear muda o texto que a grade ja' mostra em `materia_nome`, entao
      // a grade da turma aberta tambem precisa ser relida.
      if (editando && turmaSelecionada) await recarregarAulas(turmaSelecionada.id, true);
    },
    [modalMateria, turmaSelecionada, recarregarMaterias, recarregarAulas],
  );

  /**
   * Exclui a materia direto (o `PainelMaterias` ja confirmou inline).
   *
   * Diferente da aula, aqui o DELETE pode ser barrado: 409 quando alguma aula
   * usa a materia. Sem modal pra mostrar o erro, a falha vira a mensagem do
   * proprio painel — e no 409 ela precisa dizer QUANTAS aulas usam, senao o
   * usuario nao sabe o tamanho do trabalho de liberar a materia.
   */
  const aoExcluirMateria = useCallback(
    async (materia: Materia) => {
      try {
        const resposta = await fetch(`/api/admin/materias/${materia.id}`, {
          method: "DELETE",
        });

        if (!resposta.ok) {
          const corpo = (await resposta.json().catch(() => null)) as CorpoErro;
          const detail = corpo?.detalhe?.detail;

          // Mesmo no 404 vale reler antes de avisar: a materia pode ter sido
          // excluida em outra aba. A recarga limpa `erroMaterias` no sucesso,
          // entao o aviso vem DEPOIS dela — senao a mensagem sumiria sozinha.
          await recarregarMaterias(true);

          if (
            resposta.status === 409 &&
            typeof detail === "object" &&
            typeof detail?.total_aulas === "number"
          ) {
            const total = detail.total_aulas;
            setErroMaterias(
              `A matéria "${materia.nome}" está em uso por ${total} aula${
                total === 1 ? "" : "s"
              } — remova a matéria dessas aulas antes de excluí-la.`,
            );
            return;
          }

          setErroMaterias(corpo?.erro ?? "Não foi possível excluir a matéria.");
          return;
        }

        // Sucesso nao mexe na grade de aulas de proposito: o backend so' deixa
        // excluir materia com ZERO aulas vinculadas (senao e' o 409 acima),
        // entao nenhuma aula na tela podia estar apontando pra ela.
        await recarregarMaterias(true);
      } catch (causa) {
        console.error("[cupcam] falha ao excluir materia:", causa);
        setErroMaterias("Não foi possível excluir a matéria.");
      }
    },
    [recarregarMaterias],
  );

  /* --- Aluno: criar/editar pelo mesmo modal (multipart) --- */
  const aoNovoAluno = useCallback(() => setModalAluno({ modo: "criar" }), []);
  const aoEditar = useCallback(
    (aluno: AlunoAdmin) => setModalAluno({ modo: "editar", aluno }),
    [],
  );

  const aoSalvarAluno = useCallback(
    async (form: FormData) => {
      if (!modalAluno) return;
      const editando = modalAluno.modo === "editar";
      const url = editando
        ? `/api/admin/alunos/${encodeURIComponent(modalAluno.aluno!.ra)}`
        : "/api/admin/alunos";

      const resposta = await fetch(url, {
        method: editando ? "PUT" : "POST",
        body: form,
      });

      if (!resposta.ok) {
        // {erro, detalhe?}: `detalhe` e' {detail: string} do FastAPI — 422 cobre
        // sem rosto, 2+ rostos, foto ilegivel, tipo/tamanho invalido.
        const corpo = (await resposta.json().catch(() => null)) as
          | { erro?: string; detalhe?: { detail?: string } }
          | null;
        const mensagem =
          corpo?.detalhe?.detail ??
          corpo?.erro ??
          `Não foi possível ${editando ? "salvar" : "cadastrar"} o aluno.`;
        throw new Error(mensagem);
      }

      setModalAluno(null);
      await recarregar();
    },
    [modalAluno, recarregar],
  );

  /* --- Excluir aluno: modal de 2 estagios (409 = historico) --- */
  const aoExcluir = useCallback((aluno: AlunoAdmin) => {
    setAlunoParaExcluir(aluno);
  }, []);

  const aoConfirmarExclusao = useCallback(
    async (confirmarHistorico: boolean) => {
      if (!alunoParaExcluir) return;

      const resposta = await fetch(
        `/api/admin/alunos/${encodeURIComponent(alunoParaExcluir.ra)}?confirmar_historico=${confirmarHistorico}`,
        { method: "DELETE" },
      );

      if (!resposta.ok) {
        // No 409 (historico de presenca), `detalhe` e' {detail: {nome,
        // total_registros}}. O modal usa esse formato pra decidir o estagio 2.
        const corpo = (await resposta.json().catch(() => null)) as
          | { erro?: string; detalhe?: { detail?: { nome?: string; total_registros?: number } } }
          | null;

        if (resposta.status === 409 && corpo?.detalhe?.detail) {
          const erro409 = new Error(corpo.erro ?? "Aluno tem histórico de presença.") as Error & {
            historico?: { nome: string; total_registros: number };
          };
          const { nome, total_registros } = corpo.detalhe.detail;
          if (typeof nome === "string" && typeof total_registros === "number") {
            erro409.historico = { nome, total_registros };
          }
          throw erro409;
        }

        throw new Error(corpo?.erro ?? "Não foi possível excluir o aluno.");
      }

      setAlunoParaExcluir(null);
      await recarregar();
    },
    [alunoParaExcluir, recarregar],
  );

  /* --- Excluir turma: modal com estado bloqueado (409 = turma com alunos) --- */
  const aoExcluirTurma = useCallback((turma: TurmaAdmin) => {
    setTurmaParaExcluir(turma);
  }, []);

  const aoConfirmarExclusaoTurma = useCallback(async () => {
    if (!turmaParaExcluir) return;

    const resposta = await fetch(`/api/admin/turmas/${turmaParaExcluir.id}`, {
      method: "DELETE",
    });

    if (!resposta.ok) {
      // O 409 tem DOIS motivos: "alunos" ({nome, total_alunos}) e "historico"
      // ({nome, total_sessoes}, turma que ja teve aula). O modal usa o motivo pra
      // escolher a mensagem — historico nao tem como ser resolvido pelo usuario.
      const corpo = (await resposta.json().catch(() => null)) as
        | {
            erro?: string;
            detalhe?: {
              detail?: {
                motivo?: string;
                nome?: string;
                total_alunos?: number;
                total_sessoes?: number;
              };
            };
          }
        | null;

      if (resposta.status === 409 && corpo?.detalhe?.detail) {
        const erro409 = new Error(corpo.erro ?? "Não foi possível excluir a turma.") as Error & {
          turmaBloqueada?: BloqueioTurma;
        };
        const { motivo, nome, total_alunos, total_sessoes } = corpo.detalhe.detail;
        if (typeof nome === "string") {
          if (motivo === "historico" && typeof total_sessoes === "number") {
            erro409.turmaBloqueada = { motivo: "historico", nome, total: total_sessoes };
          } else if (typeof total_alunos === "number") {
            erro409.turmaBloqueada = { motivo: "alunos", nome, total: total_alunos };
          }
        }
        throw erro409;
      }

      throw new Error(corpo?.erro ?? "Não foi possível excluir a turma.");
    }

    setTurmaParaExcluir(null);
    await recarregar();
  }, [turmaParaExcluir, recarregar]);

  return (
    <div className="flex flex-col gap-7">
      <div>
        <h1
          className="text-text text-2xl font-extrabold sm:text-3xl"
          style={{ fontFamily: "var(--font-geologica)" }}
        >
          Coordenação
        </h1>
        <p className="text-text-body mt-1.5 text-sm">
          Cadastre turmas, matricule alunos e gerencie a base do CUPCAM.
        </p>
      </div>

      {/* Aviso: a mutacao deu certo, mas a recarga da lista falhou depois. */}
      {avisoRecarga && (
        <p
          role="alert"
          className="rounded-xl px-4 py-3 text-sm font-semibold"
          style={{ background: "var(--warn-bg)", color: "var(--warn-fg)" }}
        >
          {avisoRecarga}
        </p>
      )}

      {/* Cards de resumo. */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          rotulo="Turmas ativas"
          valor={visao.totais.turmas}
          apoio="Cadastradas no sistema"
          icone={
            <span style={{ color: "var(--primary)" }}>
              <IconTurma size={18} />
            </span>
          }
        />
        <StatCard
          rotulo="Alunos matriculados"
          valor={visao.totais.alunos}
          apoio="Em todas as turmas"
          icone={
            <span style={{ color: "var(--primary)" }}>
              <IconPessoas size={18} />
            </span>
          }
        />
        <StatCard
          variante="brand"
          rotulo="Média por turma"
          valor={mediaPorTurma ?? "—"}
          apoio="Alunos por turma"
          icone={
            <span style={{ color: "var(--text-on-brand)" }}>
              <IconTendencia size={18} />
            </span>
          }
        />
      </div>

      {/* Paineis: turmas a esquerda; a direita, alunos e (abaixo) as aulas da
          turma selecionada. Em tela estreita as tres colunas empilham. */}
      <div className="grid gap-5 lg:grid-cols-[340px_1fr] lg:items-start">
        <PainelTurmas
          turmas={visao.turmas}
          selecionadaId={selecionadaId}
          aoSelecionar={setSelecionadaId}
          aoNovaTurma={aoNovaTurma}
          aoEditarTurma={aoEditarTurma}
          aoExcluirTurma={aoExcluirTurma}
        />
        <div className="flex flex-col gap-5">
          <PainelAlunos
            turma={turmaSelecionada}
            alunos={alunosDaTurma}
            versaoFotos={versaoFotos}
            aoNovoAluno={aoNovoAluno}
            aoEditar={aoEditar}
            aoExcluir={aoExcluir}
          />
          {/* `key` na turma remonta o painel a cada troca. Sem isso o estado
              local "aula armada pra excluir" sobrevive a troca de turma, e uma
              aula da turma nova com o mesmo id numerico apareceria pre-armada —
              um clique so' apagaria uma aula que o usuario nunca armou. */}
          <PainelAulas
            key={turmaSelecionada?.id}
            turma={turmaSelecionada}
            aulas={aulas}
            carregando={carregandoAulas}
            erro={erroAulas}
            aoNovaAula={aoNovaAula}
            aoEditarAula={aoEditarAula}
            aoExcluirAula={aoExcluirAula}
          />
        </div>
      </div>

      {/* Materias sao globais: nao pertencem a turma selecionada, entao ficam
          numa secao propria de largura cheia, fora do grid acima. */}
      <PainelMaterias
        materias={materias}
        carregando={carregandoMaterias}
        erro={erroMaterias}
        aoNovaMateria={aoNovaMateria}
        aoEditarMateria={aoEditarMateria}
        aoExcluirMateria={aoExcluirMateria}
      />

      <ModalTurma
        aberto={modalTurma !== null}
        modo={modalTurma?.modo ?? "criar"}
        turma={modalTurma?.turma ?? null}
        aoFechar={() => setModalTurma(null)}
        aoSalvar={aoSalvarTurma}
      />

      <ModalAula
        aberto={modalAula !== null}
        modo={modalAula?.modo ?? "criar"}
        aula={modalAula?.aula ?? null}
        materias={materias}
        aoFechar={() => setModalAula(null)}
        aoSalvar={aoSalvarAula}
      />

      <ModalMateria
        aberto={modalMateria !== null}
        modo={modalMateria?.modo ?? "criar"}
        materia={modalMateria?.materia ?? null}
        aoFechar={() => setModalMateria(null)}
        aoSalvar={aoSalvarMateria}
      />

      <ModalAluno
        aberto={modalAluno !== null}
        modo={modalAluno?.modo ?? "criar"}
        turmas={visao.turmas}
        turmaInicialId={turmaSelecionada?.id ?? null}
        aluno={modalAluno?.aluno ?? null}
        aoFechar={() => setModalAluno(null)}
        aoSalvar={aoSalvarAluno}
      />

      <ModalConfirmarExclusao
        aluno={alunoParaExcluir}
        aberto={alunoParaExcluir !== null}
        aoFechar={() => setAlunoParaExcluir(null)}
        aoConfirmar={aoConfirmarExclusao}
      />

      <ModalConfirmarExclusaoTurma
        turma={turmaParaExcluir}
        aberto={turmaParaExcluir !== null}
        aoFechar={() => setTurmaParaExcluir(null)}
        aoConfirmar={aoConfirmarExclusaoTurma}
      />
    </div>
  );
}
