"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";

import {
  CamposDaFicha,
  FICHA_VAZIA,
  fichaEstaVazia,
  fichaParaEnviar,
  respostaInicial,
  type ValoresDaFicha,
} from "@/components/coordenacao/campos-da-ficha";
import { useFocoPreso } from "@/components/coordenacao/usar-foco-preso";
import { CampoComExemplo } from "@/components/ui/campo-com-exemplo";
import { BotaoIcone } from "@/components/ui/botao-icone";
import { IconFechar, IconFicha, IconFoto } from "@/components/ui/icons";
import type { AlunoAdmin, TurmaAdmin } from "@/lib/types";

type ModoModal = "criar" | "editar";

type ModalAlunoProps = {
  aberto: boolean;
  modo: ModoModal;
  /** Todas as turmas — alimenta o select. */
  turmas: TurmaAdmin[];
  /** Turma pre-selecionada no modo criar — a que esta aberta por tras do modal. */
  turmaInicialId: number | null;
  /** Aluno sendo editado (obrigatorio no modo "editar"; ignorado no "criar"). */
  aluno?: AlunoAdmin | null;
  aoFechar: () => void;
  /** Rejeita com Error(mensagem) — o modal mostra o texto e permanece aberto. */
  aoSalvar: (form: FormData) => Promise<void>;
};

/** 8 MB — mesmo limite que a API aplica (413); barrado aqui antes de subir o arquivo. */
const TAMANHO_MAXIMO_FOTO_BYTES = 8 * 1024 * 1024;

const VALORES_INICIAIS = {
  nome: "",
  ra: "",
};

/**
 * Modal de aluno unificado — cria um aluno novo ou edita um existente, decidido
 * pelo prop `modo`. Segue o molde do modal de turma: overlay escurecido, Esc
 * fecha, clique fora fecha, foco inicial, reset ao abrir, erro inline.
 *
 * Foto e' OPCIONAL nos dois modos (a camera so' reconhece quem tem foto). No
 * modo criar, submeter sem foto pede uma confirmacao inline antes de enviar —
 * cadastrar alguem sem reconhecimento e' uma escolha consciente, nao um
 * esquecimento. No modo editar, o RA e' imutavel (somente leitura) e a foto
 * atual aparece no preview; o usuario pode troca-la ou remove-la.
 *
 * O preview local usa URL.createObjectURL (revogado na troca/fechamento — a
 * foto nunca sai do navegador antes do envio). O envio gera o embedding facial
 * no backend, que leva mais de 1s, por isso o estado dedicado de envio.
 */
export function ModalAluno({
  aberto,
  modo,
  turmas,
  turmaInicialId,
  aluno,
  aoFechar,
  aoSalvar,
}: ModalAlunoProps) {
  const [valores, setValores] = useState(VALORES_INICIAIS);
  const [turmaId, setTurmaId] = useState<string>("");
  const [foto, setFoto] = useState<File | null>(null);
  /** So' no editar: usuario clicou "Remover foto" (apaga o reconhecimento atual). */
  const [removerFoto, setRemoverFoto] = useState(false);
  /** So' no criar: submeteu sem foto e precisa confirmar antes de enviar. */
  const [confirmandoSemFoto, setConfirmandoSemFoto] = useState(false);
  const [erroValidacao, setErroValidacao] = useState<string | null>(null);
  const [erroApi, setErroApi] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  /**
   * A ficha de apoio, editada JUNTO do cadastro (29/08/2026).
   *
   * Antes ela vivia num painel separado na pagina da turma. Dois lugares
   * editando o mesmo dado sensivel saem de sincronia, e o professor tinha que
   * saber que existia um segundo lugar.
   *
   * `carregandoFicha` distingue "ainda buscando" de "nao tem ficha": mostrar
   * campos vazios enquanto carrega faria o professor achar que nao ha nada e
   * salvar por cima.
   */
  const [ficha, setFicha] = useState<ValoresDaFicha>(FICHA_VAZIA);
  const [fichaOriginal, setFichaOriginal] = useState<ValoresDaFicha>(FICHA_VAZIA);
  const [carregandoFicha, setCarregandoFicha] = useState(false);
  /** A opcao "condicoes especiais" esta marcada? Decide o que a ficha GRAVA. */
  const [temCondicao, setTemCondicao] = useState(false);

  const editando = modo === "editar";

  // Espelha `aberto` so' pra detectar a transicao fechado->aberto durante a
  // renderizacao (padrao oficial "estado derivado de props/estado anterior",
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes)
  // em vez de resetar via setState dentro de um useEffect.
  const [abertoAnterior, setAbertoAnterior] = useState(aberto);
  if (aberto !== abertoAnterior) {
    setAbertoAnterior(aberto);
    if (aberto) {
      // Editar pre-preenche do aluno; criar comeca vazio na turma aberta.
      if (editando && aluno) {
        setValores({ nome: aluno.nome, ra: aluno.ra });
        setTurmaId(String(aluno.turma_id));
      } else {
        setValores(VALORES_INICIAIS);
        setTurmaId(turmaInicialId !== null ? String(turmaInicialId) : "");
      }
      setFicha(FICHA_VAZIA);
      setFichaOriginal(FICHA_VAZIA);
      setTemCondicao(false);
      // Ligada aqui, e nao dentro do efeito que busca: setState sincrono no
      // corpo de um efeito dispara render em cascata. Este bloco ja' roda
      // durante a renderizacao, que e' o lugar certo pra estado derivado.
      // No modo criar nao ha' o que buscar, entao ja' nasce desligada.
      setCarregandoFicha(editando && Boolean(aluno));
      setFoto(null);
      setRemoverFoto(false);
      setConfirmandoSemFoto(false);
      setErroValidacao(null);
      setErroApi(null);
      setEnviando(false);
    }
  }

  const primeiroCampoRef = useRef<HTMLInputElement>(null);
  const inputFotoRef = useRef<HTMLInputElement>(null);
  const idTitulo = useId();
  const refModal = useFocoPreso(aberto);

  // Preview da foto ESCOLHIDA agora (blob local). Derivado direto da foto, sem
  // estado proprio — object URL recriado so' quando `foto` muda.
  const previewUrl = useMemo(() => (foto ? URL.createObjectURL(foto) : null), [foto]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    if (!aberto) return;
    if (inputFotoRef.current) inputFotoRef.current.value = "";
    primeiroCampoRef.current?.focus();
  }, [aberto]);

  /**
   * Busca a ficha do aluno ao abrir em modo EDITAR.
   *
   * `cancelado` protege contra a resposta de um aluno chegar depois de o modal
   * ter sido fechado ou reaberto em outro: sem isso, a ficha de um aluno podia
   * aparecer no formulario de outro — que em dado sensivel e' o pior tipo de
   * bug de corrida.
   */
  useEffect(() => {
    if (!aberto || !editando || !aluno) return;

    let cancelado = false;

    fetch(`/api/admin/alunos/${encodeURIComponent(aluno.ra)}/ficha`)
      .then((resposta) => (resposta.ok ? resposta.json() : null))
      .then((corpo) => {
        if (cancelado) return;
        // `tem_ficha: false` e' resposta VALIDA — significa "sem ficha
        // cadastrada", nunca "aluno sem necessidade de apoio".
        const valores: ValoresDaFicha =
          corpo && corpo.tem_ficha
            ? {
                tipos_de_apoio: corpo.tipos_de_apoio ?? [],
                descricao: corpo.descricao ?? "",
                adaptacoes: corpo.adaptacoes ?? "",
              }
            : FICHA_VAZIA;
        setFicha(valores);
        setFichaOriginal(valores);
        // Ja' nasce marcada quando o aluno TEM apoio: senao a ficha de quem
        // tem laudo abriria fechada e o professor acharia que o dado sumiu.
        setTemCondicao(respostaInicial(valores));
      })
      .catch(() => {
        // Falha na ficha nao derruba o cadastro: o professor continua podendo
        // corrigir o nome do aluno. A ficha fica como estava no servidor,
        // porque nada sera enviado se ele nao mexer nela.
        if (!cancelado) {
          setFicha(FICHA_VAZIA);
          setFichaOriginal(FICHA_VAZIA);
        }
      })
      .finally(() => {
        if (!cancelado) setCarregandoFicha(false);
      });

    return () => {
      cancelado = true;
    };
  }, [aberto, editando, aluno]);

  useEffect(() => {
    if (!aberto) return;

    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") aoFechar();
    };

    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [aberto, aoFechar]);

  useEffect(() => {
    if (!aberto) return;

    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = anterior;
    };
  }, [aberto]);

  if (!aberto) return null;

  /**
   * Fonte do preview, em ordem de prioridade:
   *  1. foto nova escolhida agora (blob local);
   *  2. no editar, a foto ATUAL do aluno (a menos que ele tenha pedido remover);
   *  3. nada — mostra o placeholder de camera.
   */
  const fotoAtualUrl =
    editando && aluno?.tem_reconhecimento && !removerFoto && !foto
      ? `/api/admin/alunos/${encodeURIComponent(aluno.ra)}/foto`
      : null;
  const urlPreview = previewUrl ?? fotoAtualUrl;
  const temFotoNoPreview = urlPreview !== null;

  function aoEscolherFoto(evento: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = evento.target.files?.[0] ?? null;
    setErroValidacao(null);
    // Escolher uma foto cancela tanto a intencao de remover quanto o passo de
    // confirmacao "sem foto".
    setRemoverFoto(false);
    setConfirmandoSemFoto(false);

    if (arquivo && arquivo.size > TAMANHO_MAXIMO_FOTO_BYTES) {
      setErroValidacao("A foto precisa ter até 8 MB.");
      setFoto(null);
      if (inputFotoRef.current) inputFotoRef.current.value = "";
      return;
    }

    setFoto(arquivo);
  }

  function aoRemoverFoto() {
    setFoto(null);
    setRemoverFoto(true);
    setErroValidacao(null);
    if (inputFotoRef.current) inputFotoRef.current.value = "";
  }

  async function aoSubmeter(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErroApi(null);

    const { nome, ra } = valores;
    // Campos obrigatorios: nome, turma e (so' no criar) RA. Foto e' opcional.
    if (!nome.trim() || !turmaId || (!editando && !ra.trim())) {
      setErroValidacao(
        editando
          ? "Preencha o nome e escolha a turma."
          : "Preencha nome, RA e escolha a turma.",
      );
      return;
    }
    if (foto && foto.size > TAMANHO_MAXIMO_FOTO_BYTES) {
      setErroValidacao("A foto precisa ter até 8 MB.");
      return;
    }
    setErroValidacao(null);

    // Criar sem foto: pede confirmacao explicita antes de enviar (o aluno nao
    // sera reconhecido pela camera). Editar nao precisa — remover a foto ja e'
    // uma acao deliberada, e manter a foto atual e' o padrao.
    if (!editando && !foto && !confirmandoSemFoto) {
      setConfirmandoSemFoto(true);
      return;
    }

    // Nomes de campo exatos que as rotas esperam.
    const form = new FormData();
    form.append("nome", nome.trim());
    form.append("turma_id", turmaId);
    if (foto) form.append("foto", foto);

    if (editando) {
      // RA e' imutavel — nao vai no corpo. remover_foto so' quando pedido e sem
      // foto nova (foto nova ja substitui o reconhecimento).
      if (removerFoto && !foto) form.append("remover_foto", "true");
    } else {
      form.append("ra", ra.trim());
    }

    setEnviando(true);
    try {
      await aoSalvar(form);

      // A FICHA VAI DEPOIS DO ALUNO, e por dois motivos:
      //   1. no modo criar o aluno precisa existir antes — a rota da ficha
      //      responde 404 pra RA que ainda nao foi cadastrado;
      //   2. o cadastro e' multipart (por causa da foto) e a ficha e' JSON.
      // Enviada so' quando MUDOU: um PUT com os tres campos vazios APAGA a
      // ficha, e mandar sempre destruiria a ficha de todo aluno que tivesse o
      // nome corrigido.
      // Desmarcar LIMPA a parte sensivel — mas so' aqui, no envio: com o modal
      // aberto o professor podia voltar atras sem ter perdido nada.
      const paraEnviar = fichaParaEnviar(ficha, temCondicao);

      const mudouFicha =
        paraEnviar.descricao !== fichaOriginal.descricao ||
        paraEnviar.adaptacoes !== fichaOriginal.adaptacoes ||
        paraEnviar.tipos_de_apoio.slice().sort().join() !==
          fichaOriginal.tipos_de_apoio.slice().sort().join();

      if (mudouFicha) {
        const raDaFicha = editando ? aluno!.ra : ra.trim();
        const resposta = await fetch(
          `/api/admin/alunos/${encodeURIComponent(raDaFicha)}/ficha`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(paraEnviar),
          },
        );
        if (!resposta.ok) {
          // O aluno JA' foi salvo neste ponto. Dizer isso evita o professor
          // achar que perdeu tudo e cadastrar de novo — o que criaria um
          // duplicado.
          throw new Error(
            "O aluno foi salvo, mas a ficha de apoio não. Abra de novo para tentar.",
          );
        }
      }
      // Sucesso: a vista fecha e recarrega — nao mexe aqui.
    } catch (causa) {
      setErroApi(
        causa instanceof Error
          ? causa.message
          : `Não foi possível ${editando ? "salvar" : "cadastrar"} o aluno.`,
      );
    } finally {
      setEnviando(false);
    }
  }

  const erroExibido = erroValidacao ?? erroApi;
  const rotuloBotaoFoto = temFotoNoPreview ? "Trocar foto" : "Escolher foto";
  const textoBotaoSalvar = enviando
    ? foto
      ? "Gerando reconhecimento facial…" // com foto o backend gera o embedding (>1s)
      : "Salvando…"
    : editando
      ? "Salvar alterações"
      : confirmandoSemFoto
        ? "Cadastrar mesmo assim"
        : "Adicionar aluno";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={aoFechar}
    >
      <div
        ref={refModal}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        onClick={(evento) => evento.stopPropagation()}
        /* max-w-lg e a rolagem interna (29/08/2026): o modal ganhou os tres
           campos da ficha de apoio, e com `max-w-md` o formulario passava da
           altura da tela em monitor baixo — os botoes saiam de vista, e o
           modal nao rola com a pagina porque ela esta travada. */
        className="flex max-h-[90vh] w-full max-w-lg flex-col gap-5 overflow-y-auto rounded-2xl p-6"
        style={{
          background: "var(--modal)",
          border: "1px solid var(--border)",
          boxShadow: "var(--shadow-raise)",
        }}
      >
        <div className="flex items-center justify-between gap-2">
          <h2
            id={idTitulo}
            className="text-text text-lg font-semibold"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {editando ? "Editar aluno" : "Adicionar aluno"}
          </h2>
          <BotaoIcone
            rotulo="Fechar"
            aoClicar={aoFechar}
            desabilitado={enviando}
            cor="var(--text-muted)"
          >
            <IconFechar size={20} />
          </BotaoIcone>
        </div>

        <form onSubmit={aoSubmeter} className="flex flex-col gap-4" noValidate>
          {/* Foto: preview circular + botao estilizado sobre o input nativo. */}
          <div className="flex flex-col items-center gap-2.5 self-center">
            <label className="flex cursor-pointer flex-col items-center gap-2.5">
              <span className="sr-only">Foto do aluno</span>
              <span
                className="flex h-24 w-24 flex-none items-center justify-center overflow-hidden rounded-full"
                style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
              >
                {urlPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element -- preview local (blob:) ou thumb da ponte /api/admin/alunos/{ra}/foto; nunca vira <Image> remota.
                  <img
                    src={urlPreview}
                    alt="Foto do aluno"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-text-muted" aria-hidden>
                    <IconFoto size={26} />
                  </span>
                )}
              </span>
              <span
                className="text-text-body rounded-lg px-3 py-1.5 text-xs font-semibold"
                style={{ border: "1px solid var(--border)" }}
              >
                {rotuloBotaoFoto}
              </span>
              <input
                ref={inputFotoRef}
                type="file"
                accept="image/jpeg,image/png"
                onChange={aoEscolherFoto}
                className="sr-only"
                disabled={enviando}
              />
            </label>

            {/* Remover foto: so' aparece quando ha algo pra remover no preview. */}
            {temFotoNoPreview && (
              <button
                type="button"
                onClick={aoRemoverFoto}
                disabled={enviando}
                className="text-xs font-semibold underline disabled:cursor-not-allowed disabled:opacity-40"
                style={{ color: "var(--danger)" }}
              >
                Remover foto
              </button>
            )}
          </div>

          <CampoComExemplo
            ref={primeiroCampoRef}
            rotulo="Nome do aluno"
            valor={valores.nome}
            aoMudar={(nome) => setValores((atuais) => ({ ...atuais, nome }))}
            exemplo="Ana Beatriz Silva"
            required
            disabled={enviando}
          />

          {/* No modo editar o RA e' somente leitura: `exemplo` fica de fora
              pra que o Tab nao tente preencher um campo que nem aceita
              digitacao, e a dica explica por que ele esta travado. */}
          <CampoComExemplo
            rotulo="RA"
            valor={valores.ra}
            aoMudar={(ra) => setValores((atuais) => ({ ...atuais, ra }))}
            exemplo={editando ? undefined : "202400123"}
            dica={editando ? "O RA não pode ser alterado." : undefined}
            required={!editando}
            readOnly={editando}
            className="read-only:opacity-60"
            disabled={enviando}
          />

          <Campo rotulo="Turma">
            <select
              required
              value={turmaId}
              onChange={(evento) => setTurmaId(evento.target.value)}
              className="text-text w-full rounded-lg bg-transparent px-3 py-2 text-sm outline-none"
              style={{ border: "1px solid var(--border)" }}
              disabled={enviando}
            >
              <option value="" disabled>
                Selecione uma turma
              </option>
              {turmas.map((turma) => (
                <option key={turma.id} value={turma.id}>
                  {turma.nome}
                </option>
              ))}
            </select>
          </Campo>

          {/* FICHA DE APOIO — dado pessoal SENSIVEL (LGPD art. 5o, II).
              Vive aqui desde 29/08/2026; antes era um painel separado na pagina
              da turma, e dois lugares editando o mesmo dado saem de sincronia.
              As travas continuam no backend (ver gestao/fichas.py). */}
          {/* MAIS VISIVEL (29/08/2026): era `--surface-2`, a elevacao mais
              sutil do sistema — o card se perdia entre os campos e ele nao
              achava. Agora tem superficie propria, borda na cor da marca e um
              filete de destaque na esquerda. */}
          <div
            className="flex flex-col gap-3 overflow-hidden rounded-xl p-4"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--primary-soft-hover)",
              borderLeft: "3px solid var(--primary)",
              boxShadow: "var(--shadow-card)",
            }}
          >
            <div className="flex items-center gap-2">
              {/* O icone ganha um disco da marca: sozinho, em --text-muted, ele
                  lia como decoracao. */}
              <span
                className="grid size-[26px] flex-none place-items-center rounded-lg"
                /* A cor vai no CONTAINER: os icones do projeto desenham com
                   `currentColor`, e `IconProps` nao aceita `style`. */
                style={{ background: "var(--primary-soft)", color: "var(--primary)" }}
                aria-hidden
              >
                <IconFicha size={15} />
              </span>
              <h3 className="text-text text-[14px] font-semibold">
                Ficha de apoio
              </h3>
              <span className="text-text-muted ml-auto text-[11px]">
                tudo opcional
              </span>
            </div>

            {carregandoFicha ? (
              // "Carregando" e nao campos vazios: campos vazios fariam o
              // professor achar que nao ha ficha e salvar por cima da que
              // existe.
              <p className="text-text-muted text-[12.5px]">Carregando a ficha…</p>
            ) : (
              <CamposDaFicha
                valores={ficha}
                aoMudar={setFicha}
                temCondicao={temCondicao}
                aoResponder={setTemCondicao}
                desabilitado={enviando}
              />
            )}

            {/* Aviso so' quando ele esta ESVAZIANDO uma ficha que existia: o
                PUT vazio apaga, e apagar dado sensivel sem avisar seria
                silencioso demais. */}
            {!carregandoFicha &&
              fichaEstaVazia(ficha) &&
              !fichaEstaVazia(fichaOriginal) && (
                <p
                  className="rounded-lg px-3 py-2 text-[12px]"
                  style={{
                    background: "var(--warn-bg)",
                    color: "var(--warn-fg)",
                  }}
                >
                  Ao salvar, a ficha de apoio deste aluno será apagada.
                </p>
              )}
          </div>

          {/* Aviso de confirmacao: criar sem foto. */}
          {confirmandoSemFoto && !foto && (
            <p
              role="alert"
              className="rounded-xl px-4 py-3 text-sm font-semibold"
              style={{ background: "var(--warn-bg)", color: "var(--warn-fg)" }}
            >
              Sem foto, este aluno não será reconhecido pela câmera. Você ainda
              pode escolher uma foto acima, ou cadastrar mesmo assim.
            </p>
          )}

          {erroExibido && (
            <p
              role="alert"
              className="rounded-xl px-4 py-3 text-sm font-semibold"
              style={{ background: "var(--danger-bg)", color: "var(--danger-fg)" }}
            >
              {erroExibido}
            </p>
          )}

          <div className="mt-1 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={aoFechar}
              disabled={enviando}
              className="text-text-body rounded-lg px-4 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={enviando}
              className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-60"
              style={{ background: "var(--primary)" }}
            >
              {enviando && (
                <span
                  aria-hidden
                  className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white"
                />
              )}
              {textoBotaoSalvar}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Campo({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-text-muted text-xs font-semibold">{rotulo}</span>
      {children}
    </label>
  );
}
