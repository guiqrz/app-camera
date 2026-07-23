"use client";

import { useEffect, useId, useRef, useState } from "react";

import { IconFechar, IconFoto } from "@/components/ui/icons";
import type { TurmaAdmin } from "@/lib/types";

type ModalNovoAlunoProps = {
  aberto: boolean;
  /** Todas as turmas — alimenta o select. */
  turmas: TurmaAdmin[];
  /** Turma pre-selecionada — a que esta aberta na tela por tras do modal. */
  turmaInicialId: number | null;
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
 * Modal "Novo aluno" — segue o molde do ModalNovaTurma (B3): overlay
 * escurecido, Esc fecha, clique fora fecha, foco inicial no primeiro campo,
 * reset ao abrir, erro inline.
 *
 * Diferencial daqui: upload de foto com preview local (URL.createObjectURL,
 * revogada na troca/fechamento — nunca sobe nada sozinha, so' vai pro
 * servidor quando o formulario e' enviado) e um estado dedicado de envio
 * porque o cadastro gera o embedding facial no backend, que leva mais de 1s.
 */
export function ModalNovoAluno({
  aberto,
  turmas,
  turmaInicialId,
  aoFechar,
  aoSalvar,
}: ModalNovoAlunoProps) {
  const [valores, setValores] = useState(VALORES_INICIAIS);
  const [turmaId, setTurmaId] = useState<string>("");
  const [foto, setFoto] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [erroValidacao, setErroValidacao] = useState<string | null>(null);
  const [erroApi, setErroApi] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const primeiroCampoRef = useRef<HTMLInputElement>(null);
  const inputFotoRef = useRef<HTMLInputElement>(null);
  const idTitulo = useId();

  // Reseta o formulario toda vez que o modal abre — nao carrega lixo da
  // ultima tentativa (sucesso ou erro), e pre-seleciona a turma que estava
  // aberta na tela.
  useEffect(() => {
    if (!aberto) return;
    setValores(VALORES_INICIAIS);
    setTurmaId(turmaInicialId !== null ? String(turmaInicialId) : "");
    setFoto(null);
    setErroValidacao(null);
    setErroApi(null);
    setEnviando(false);
    if (inputFotoRef.current) inputFotoRef.current.value = "";
    primeiroCampoRef.current?.focus();
  }, [aberto, turmaInicialId]);

  // O preview e' um objeto do navegador (blob: URL) — precisa ser revogado
  // sempre que a foto muda ou o componente desmonta, senao vaza memoria.
  // Como a foto nunca sai do navegador antes do envio, isso tambem garante
  // que nao sobra nenhum rastro dela alem do FormData que vai pro fetch.
  useEffect(() => {
    if (!foto) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(foto);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [foto]);

  // Esc fecha — mesmo padrao da gaveta do menu (sidebar.tsx).
  useEffect(() => {
    if (!aberto) return;

    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") aoFechar();
    };

    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [aberto, aoFechar]);

  // Trava a rolagem do fundo enquanto o modal esta aberto.
  useEffect(() => {
    if (!aberto) return;

    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = anterior;
    };
  }, [aberto]);

  if (!aberto) return null;

  function aoEscolherFoto(evento: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = evento.target.files?.[0] ?? null;
    setErroValidacao(null);

    if (arquivo && arquivo.size > TAMANHO_MAXIMO_FOTO_BYTES) {
      setErroValidacao("A foto precisa ter até 8 MB.");
      setFoto(null);
      if (inputFotoRef.current) inputFotoRef.current.value = "";
      return;
    }

    setFoto(arquivo);
  }

  async function aoSubmeter(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErroApi(null);

    // Validacao cliente: todos os campos, incluindo a foto, sao obrigatorios.
    const { nome, ra } = valores;
    if (!nome.trim() || !ra.trim() || !turmaId || !foto) {
      setErroValidacao("Preencha todos os campos e escolha uma foto.");
      return;
    }
    if (foto.size > TAMANHO_MAXIMO_FOTO_BYTES) {
      setErroValidacao("A foto precisa ter até 8 MB.");
      return;
    }
    setErroValidacao(null);

    // Nomes de campo exatos que a API espera (src/app/api/admin/alunos/route.ts).
    const form = new FormData();
    form.append("foto", foto);
    form.append("ra", ra.trim());
    form.append("nome", nome.trim());
    form.append("turma_id", turmaId);

    setEnviando(true);
    try {
      await aoSalvar(form);
      // Sucesso: quem chama (a vista) fecha e recarrega — nao mexe aqui.
    } catch (causa) {
      setErroApi(causa instanceof Error ? causa.message : "Não foi possível cadastrar o aluno.");
    } finally {
      setEnviando(false);
    }
  }

  const erroExibido = erroValidacao ?? erroApi;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={aoFechar}
      aria-hidden={false}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        onClick={(evento) => evento.stopPropagation()}
        className="flex w-full max-w-md flex-col gap-5 rounded-2xl p-6"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          boxShadow: "var(--shadow-raise)",
        }}
      >
        <div className="flex items-center justify-between gap-2">
          <h2
            id={idTitulo}
            className="text-text text-lg font-extrabold"
            style={{ fontFamily: "var(--font-geologica)" }}
          >
            Adicionar aluno
          </h2>
          <button
            type="button"
            onClick={aoFechar}
            aria-label="Fechar"
            className="text-text-muted rounded-lg p-1"
            disabled={enviando}
          >
            <IconFechar size={20} />
          </button>
        </div>

        <form onSubmit={aoSubmeter} className="flex flex-col gap-4" noValidate>
          {/* Foto: preview circular + botao estilizado sobre o input nativo. */}
          <label className="flex flex-col items-center gap-2.5 self-center">
            <span className="sr-only">Foto do aluno</span>
            <span
              className="flex h-24 w-24 flex-none items-center justify-center overflow-hidden rounded-full"
              style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
            >
              {previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- preview local (blob:), nunca vira <Image> remota.
                <img
                  src={previewUrl}
                  alt="Pré-visualização da foto do aluno"
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-text-muted" aria-hidden>
                  <IconFoto size={26} />
                </span>
              )}
            </span>
            <span
              className="text-text-body rounded-lg px-3 py-1.5 text-xs font-bold"
              style={{ border: "1px solid var(--border)" }}
            >
              {foto ? "Trocar foto" : "Escolher foto"}
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

          <Campo rotulo="Nome do aluno">
            <input
              ref={primeiroCampoRef}
              type="text"
              required
              value={valores.nome}
              onChange={(evento) =>
                setValores((atuais) => ({ ...atuais, nome: evento.target.value }))
              }
              placeholder="Ana Beatriz Silva"
              className="text-text w-full rounded-lg bg-transparent px-3 py-2 text-sm outline-none"
              style={{ border: "1px solid var(--border)" }}
              disabled={enviando}
            />
          </Campo>

          <Campo rotulo="RA">
            <input
              type="text"
              required
              value={valores.ra}
              onChange={(evento) =>
                setValores((atuais) => ({ ...atuais, ra: evento.target.value }))
              }
              placeholder="202400123"
              className="text-text w-full rounded-lg bg-transparent px-3 py-2 text-sm outline-none"
              style={{ border: "1px solid var(--border)" }}
              disabled={enviando}
            />
          </Campo>

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
              className="text-text-body rounded-lg px-4 py-2.5 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-40"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={enviando}
              className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-extrabold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-60"
              style={{ background: "var(--primary)" }}
            >
              {enviando && (
                <span
                  aria-hidden
                  className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white"
                />
              )}
              {/* O embedding facial demora mais de 1s — avisa explicitamente
                  em vez de deixar o botao "Salvando..." generico. */}
              {enviando ? "Gerando reconhecimento facial…" : "Adicionar aluno"}
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
      <span className="text-text-muted text-xs font-bold">{rotulo}</span>
      {children}
    </label>
  );
}
