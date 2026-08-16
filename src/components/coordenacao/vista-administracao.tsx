"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";

import { ModalAluno } from "@/components/coordenacao/modal-aluno";
import { ModalConfirmarExclusao } from "@/components/coordenacao/modal-confirmar-exclusao";
import {
  ModalConfirmarExclusaoTurma,
  type BloqueioTurma,
} from "@/components/coordenacao/modal-confirmar-exclusao-turma";
import { ModalMateria } from "@/components/coordenacao/modal-materia";
import { ModalTurma } from "@/components/coordenacao/modal-turma";
import { PainelAlunos } from "@/components/coordenacao/painel-alunos";
import { PainelMaterias } from "@/components/coordenacao/painel-materias";
import { PainelPendencias } from "@/components/coordenacao/painel-pendencias";
import { PainelTurmas } from "@/components/coordenacao/painel-turmas";
import { CartaoNumero } from "@/components/aulas/cartao-numero";
import {
  IconAulas,
  IconCamera,
  IconPessoas,
  IconTurma,
} from "@/components/ui/icons";
import type {
  AlunoAdmin,
  Materia,
  NovaMateria,
  NovaTurma,
  PanoramaCoordenacao,
  TurmaAdmin,
  TurmaPanorama,
  VisaoAdmin,
} from "@/lib/types";

type VistaAdministracaoProps = {
  /** Retrato inicial vindo do servidor no carregamento da pagina. */
  visaoInicial: VisaoAdmin;
  /** Panorama (agregados + pendencias) vindo do servidor junto da visao. */
  panoramaInicial: PanoramaCoordenacao;
};

/** Estado dos modais — modo mais o item sendo editado. */
type EstadoModalAluno = {
  modo: "criar" | "editar";
  aluno?: AlunoAdmin;
  /**
   * Turma a pre-selecionar ao criar. Só vem preenchido quando o modal foi
   * aberto por uma PENDENCIA ("cadastrar alunos" numa turma vazia): a troca de
   * turma passa pelo router e nao vale no mesmo tick, entao esperar
   * `turmaSelecionada` acompanhar abriria o modal na turma anterior.
   */
  turmaId?: number;
};
type EstadoModalMateria = { modo: "criar" | "editar"; materia?: Materia };

/**
 * Corpo de erro comum aos proxies /api/admin/*: {erro, detalhe?}, onde
 * `detalhe` e' o corpo cru do FastAPI. No 422 `detail` e' string; no 409 da
 * materia em uso e' um objeto com `total_aulas`.
 */
type CorpoErro = {
  erro?: string;
  detalhe?: { detail?: string | { total_aulas?: number } };
} | null;

/**
 * Vista interativa da tela "Coordenacao".
 *
 * CRUD de turmas (criar/excluir), alunos e materias. EDITAR turma nao mora
 * mais aqui: virou a pagina `/coordenacao/turmas/{id}`, onde os dados da turma
 * aparecem junto da grade semanal de aulas — o `PainelTurmas` linka pra la'.
 * Por isso o `ModalTurma` desta tela so' cria.
 *
 * Exclusao de aluno e de turma usa modais de confirmacao com 409 tratado:
 * aluno com historico de presenca entra num 2o estagio; turma com alunos entra
 * num estado bloqueado.
 *
 * Os filhos (PainelTurmas/PainelAlunos/PainelMaterias) sao "burros": so'
 * recebem dados e callbacks, a decisao fica toda aqui.
 */
export function VistaAdministracao({
  visaoInicial,
  panoramaInicial,
}: VistaAdministracaoProps) {
  const [visao, setVisao] = useState<VisaoAdmin>(visaoInicial);
  // O panorama anda JUNTO da visao: cadastrar um aluno muda a lista (visao) e
  // pode fazer uma pendencia sumir (panorama). Por isso `recarregar` busca os
  // dois em paralelo — atualizar so' um deixaria a tela se contradizendo.
  const [panorama, setPanorama] = useState<PanoramaCoordenacao>(panoramaInicial);

  /* A turma selecionada mora na URL (?turma={id}), nao em estado local.
     Mesma decisao ja' tomada pelos seletores de Minhas Aulas, Chamada e
     Relatorios (ver o JSDoc de components/aulas/seletor-turma.tsx): assim a
     escolha sobrevive ao F5, o endereco pode ser compartilhado e o botao voltar
     do navegador funciona. Esta tela era a unica fora dessa convencao. */
  const router = useRouter();
  const parametros = useSearchParams();
  const [navegando, iniciarNavegacao] = useTransition();

  const turmaDaUrl = Number(parametros.get("turma"));
  const selecionadaId = useMemo(() => {
    // Id valido e existente ganha; senao cai na primeira turma da lista. Cobre
    // URL sem parametro, com lixo, e turma excluida depois de virar link.
    const daUrl =
      Number.isInteger(turmaDaUrl) && turmaDaUrl > 0 ? turmaDaUrl : null;

    if (daUrl !== null && panorama.turmas.some((turma) => turma.id === daUrl)) {
      return daUrl;
    }
    return panorama.turmas[0]?.id ?? null;
  }, [turmaDaUrl, panorama.turmas]);

  const selecionarTurma = useCallback(
    (turmaId: number) => {
      iniciarNavegacao(() => router.replace(`/coordenacao?turma=${turmaId}`));
    },
    // `replace` e nao `push`: trocar de turma dentro da mesma tela e' um filtro,
    // nao uma navegacao — empilhar cada troca faria o botao voltar percorrer
    // turma por turma antes de sair da tela.
    [router],
  );

  const [modalAluno, setModalAluno] = useState<EstadoModalAluno | null>(null);
  const [modalNovaTurma, setModalNovaTurma] = useState(false);
  const [modalMateria, setModalMateria] = useState<EstadoModalMateria | null>(null);
  const [alunoParaExcluir, setAlunoParaExcluir] = useState<AlunoAdmin | null>(null);
  const [turmaParaExcluir, setTurmaParaExcluir] = useState<TurmaAdmin | null>(null);

  // Materias nao vem no retrato inicial do servidor — sao buscadas no cliente
  // pelo proxy /api/admin/materias, que carrega a X-API-Key no servidor
  // (componente "use client" nunca fala com lib/api.ts direto).
  const [materias, setMaterias] = useState<Materia[]>([]);
  const [carregandoMaterias, setCarregandoMaterias] = useState(true);
  const [erroMaterias, setErroMaterias] = useState<string | null>(null);
  // Aviso quando a mutacao (POST/PUT/DELETE) deu certo mas a recarga da visao
  // (GET) falhou depois — sem isso o modal fecha "com sucesso" e a lista fica
  // desatualizada, e o usuario pode achar que a acao nao valeu e repeti-la.
  const [avisoRecarga, setAvisoRecarga] = useState<string | null>(null);

  // Cache-buster da miniatura. A URL da foto e' constante por RA e a ponte responde
  // com Cache-Control: max-age=30, entao trocar a foto de um aluno mostraria a antiga
  // por ate' 30s. Cada recarga bem-sucedida incrementa isto, mudando a URL do <img>.
  const [versaoFotos, setVersaoFotos] = useState(0);

  /**
   * Busca o retrato mais recente da API e substitui o estado local.
   *
   * As DUAS rotas em paralelo: `/visao` traz o cadastro (turmas e alunos que a
   * tela edita) e `/panorama` traz os agregados e as pendencias. Elas mudam
   * juntas — cadastrar um aluno numa turma vazia tira uma pendencia da lista —
   * e atualizar so' uma deixaria a tela se contradizendo (a lista sem a turma
   * vazia, o aviso ainda dizendo que ela existe).
   */
  const recarregar = useCallback(async () => {
    try {
      const [respostaVisao, respostaPanorama] = await Promise.all([
        fetch("/api/admin/visao", { cache: "no-store" }),
        fetch("/api/admin/panorama", { cache: "no-store" }),
      ]);
      if (!respostaVisao.ok || !respostaPanorama.ok) {
        setAvisoRecarga(
          "Salvo, mas não foi possível atualizar a lista — recarregue a página.",
        );
        return;
      }
      const [dados, dadosPanorama] = (await Promise.all([
        respostaVisao.json(),
        respostaPanorama.json(),
      ])) as [VisaoAdmin, PanoramaCoordenacao];
      setVisao(dados);
      setPanorama(dadosPanorama);
      /* Nao ha selecao a corrigir aqui: `selecionadaId` deriva da URL cruzada
         com esta lista, entao uma turma que acabou de ser excluida cai sozinha
         na primeira do retrato novo. */
      setVersaoFotos((atual) => atual + 1);
      setAvisoRecarga(null);
    } catch (causa) {
      console.error("[cupcam] falha ao recarregar visao admin:", causa);
      setAvisoRecarga(
        "Salvo, mas não foi possível atualizar a lista — recarregue a página.",
      );
    }
  }, []);

  // Contador de requisicoes: o CRUD de materia dispara uma releitura que pode
  // cruzar com outra ja em voo — so' a mais recente escreve no estado.
  const requisicaoMateriasRef = useRef(0);

  /**
   * Busca a lista global de materias e substitui o estado local.
   *
   * Alimenta o painel de materias desta tela. O dropdown de materia do
   * formulario de aula vive na pagina da turma e busca a lista por conta
   * propria — nao depende deste estado.
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
  //
  // setTimeout(0) em vez de chamar direto no corpo do efeito: o lint
  // (react-hooks/set-state-in-effect) le o setState sincrono do inicio da
  // funcao como recalculo derivavel do render, mas ler a lista da API e'
  // conversa com um sistema externo. O timeout zero deixa isso explicito sem
  // atrasar a busca na pratica.
  useEffect(() => {
    const id = setTimeout(() => void recarregarMaterias(), 0);
    return () => clearTimeout(id);
  }, [recarregarMaterias]);

  /* A lista de turmas vem do PANORAMA, nao da visao: as duas trazem as mesmas
     turmas (mesmos ids, mesma ordem alfabetica), mas a do panorama vem com
     grade, sessoes e frequencia, que a lista exibe. A visao continua sendo a
     fonte dos ALUNOS, que o panorama nao carrega de proposito. */
  const turmaSelecionada = useMemo(
    () => panorama.turmas.find((turma) => turma.id === selecionadaId) ?? null,
    [panorama.turmas, selecionadaId],
  );

  const alunosDaTurma = useMemo(
    () =>
      turmaSelecionada
        ? visao.alunos.filter((aluno) => aluno.turma_id === turmaSelecionada.id)
        : [],
    [visao.alunos, turmaSelecionada],
  );

  /* --- Turma: so' criar aqui; editar mora na pagina da turma --- */
  const aoNovaTurma = useCallback(() => setModalNovaTurma(true), []);

  const aoCriarTurma = useCallback(
    async (dados: NovaTurma) => {
      const resposta = await fetch("/api/admin/turmas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dados),
      });

      if (!resposta.ok) {
        // Shape de erro das rotas de turma: {erro, detalhe?}. `detalhe` e' o
        // corpo cru do FastAPI, {detail: "mensagem"} no 422 de validacao.
        // Criar turma nao da 409: turma e' so' nome + sala, e conflito de
        // horario agora e' entre AULAS. (O 409 do DELETE de turma continua
        // existindo — turma com alunos — tratado em `aoConfirmarExclusaoTurma`.)
        const corpo = (await resposta.json().catch(() => null)) as CorpoErro;
        const detail = corpo?.detalhe?.detail;
        const mensagem =
          (typeof detail === "string" ? detail : undefined) ??
          corpo?.erro ??
          "Não foi possível criar a turma.";
        throw new Error(mensagem);
      }

      setModalNovaTurma(false);
      await recarregar();
    },
    [recarregar],
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
          `Não foi possível ${editando ? "salvar" : "criar"} a matéria.`;
        throw new Error(mensagem);
      }

      setModalMateria(null);
      await recarregarMaterias(true);
    },
    [modalMateria, recarregarMaterias],
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

  /**
   * "Cadastrar alunos" a partir de uma pendencia de turma vazia.
   *
   * Seleciona a turma ANTES de abrir o modal, porque o `ModalAluno` recebe
   * `turmaInicialId={turmaSelecionada?.id}`: sem isso, quem clica na pendencia
   * da 21TC cairia no modal com outra turma pre-escolhida e cadastraria o
   * aluno no lugar errado.
   *
   * A selecao passa pela URL (`selecionarTurma`), igual ao clique na lista —
   * assim o painel de alunos ao lado ja' mostra a turma certa quando o modal
   * fechar.
   */
  const aoCadastrarAlunosDaTurma = useCallback(
    (turmaId: number) => {
      selecionarTurma(turmaId);
      setModalAluno({ modo: "criar", turmaId });
    },
    [selecionarTurma],
  );
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

  /* --- Excluir turma: modal com estado bloqueado (409 = turma com alunos) ---
     Recebe `TurmaPanorama` (a lista agora vem de la'), mas guarda como
     `TurmaAdmin`: o modal so' usa nome e id, e o tipo menor deixa isso
     explicito em vez de carregar frequencia pra dentro de um dialogo de
     exclusao. */
  const aoExcluirTurma = useCallback((turma: TurmaPanorama) => {
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
    <div className="flex flex-col gap-4">
      {/* Sem `h1` aqui: o titulo da pagina e' o do cabecalho (AppShell), e o
          `h1` que existia neste ponto repetia a palavra "Coordenação" logo
          abaixo dela — dois titulos iguais na mesma tela, e dois `h1` no
          mesmo documento (leitor de tela fica sem saber qual e' o da pagina).
          Mesma correcao ja' feita na pagina da turma. */}
      <p className="coord-apoio">
        Cadastre turmas, matricule alunos e gerencie a base do CUPCAM.
      </p>

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

      {/* Os numeros da escola. `CartaoNumero` (o mesmo de Minhas Aulas, Chamada
          e Camera) no lugar do `StatCard` antigo: esta era a ultima tela fora
          do padrao do redesign.

          Os quatro sao de CADASTRO e OPERACAO — o que existe e o que a camera
          ja' rodou. Nenhum e' media de desempenho: "media por turma" (o card
          antigo) saiu porque um numero medio da escola so' serve pra comparar
          turmas contra ele, que e' o que esta tela nao faz. */}
      <div className="numeros-cam">
        <CartaoNumero
          rotulo="Turmas"
          cor="roxo"
          valor={panorama.totais.turmas}
          nota="Cadastradas no sistema"
          icone={<IconTurma size={18} />}
        />
        <CartaoNumero
          rotulo="Alunos"
          cor="azul"
          valor={panorama.totais.alunos}
          nota="Matriculados em todas as turmas"
          icone={<IconPessoas size={18} />}
        />
        <CartaoNumero
          rotulo="Aulas na grade"
          cor="verde"
          valor={panorama.totais.aulas_na_grade}
          nota={`${panorama.totais.materias} ${
            panorama.totais.materias === 1
              ? "matéria cadastrada"
              : "matérias cadastradas"
          }`}
          icone={<IconAulas size={18} />}
        />
        {/* Quantas aulas a camera ja' acompanhou. E' cobertura do sistema,
            nao produtividade de ninguem: nao abre por turma nem por professor. */}
        <CartaoNumero
          rotulo="Aulas monitoradas"
          cor="ambar"
          valor={panorama.totais.sessoes_monitoradas}
          nota="Desde o início do uso"
          icone={<IconCamera size={18} />}
        />
      </div>

      {/* O que falta configurar. Vem ANTES do cadastro de proposito: quem abre
          a tela precisa saber o que exige acao antes de mergulhar nas listas. */}
      <PainelPendencias
        pendencias={panorama.pendencias}
        aoCadastrarAlunos={aoCadastrarAlunosDaTurma}
      />

      {/* Paineis: turmas a esquerda, alunos da turma selecionada a direita. A
          grade de aulas saiu daqui — vive na pagina da turma, junto dos dados
          dela. Em tela estreita as colunas empilham. */}
      <div
        className="grid gap-5 lg:grid-cols-[340px_1fr] lg:items-start"
        // Esmaece durante a troca de turma, como fazem os outros seletores do
        // app: sem isso a navegacao parece travada por um instante.
        style={{ opacity: navegando ? 0.6 : 1 }}
      >
        <PainelTurmas
          turmas={panorama.turmas}
          selecionadaId={selecionadaId}
          aoSelecionar={selecionarTurma}
          aoNovaTurma={aoNovaTurma}
          aoExcluirTurma={aoExcluirTurma}
        />
        <PainelAlunos
          turma={turmaSelecionada}
          alunos={alunosDaTurma}
          versaoFotos={versaoFotos}
          aoNovoAluno={aoNovoAluno}
          aoEditar={aoEditar}
          aoExcluir={aoExcluir}
        />
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
        aberto={modalNovaTurma}
        aoFechar={() => setModalNovaTurma(false)}
        aoSalvar={aoCriarTurma}
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
        /* A turma da pendencia vence a selecionada: quando o modal abre por
           "cadastrar alunos" numa turma vazia, o router ainda nao propagou a
           nova selecao. Ver `aoCadastrarAlunosDaTurma`. */
        turmaInicialId={modalAluno?.turmaId ?? turmaSelecionada?.id ?? null}
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
