"use client";

import { useCallback, useEffect, useState } from "react";

import { SecaoAssistente } from "@/components/configuracoes/secao-assistente";
import { Linha, Secao, ValorFixo } from "@/components/configuracoes/secao";
import {
  useTheme,
  type PreferenciaTema,
} from "@/components/theme/theme-provider";
import { definirTurmaPadrao, lerTurmaPadrao } from "@/lib/preferencias";
import type { EstadoCamera, Turma } from "@/lib/types";

type PainelGeralProps = {
  turmas: Turma[];
  /** Estado da camera lido no servidor; null se a API estava fora. */
  estadoCamera: EstadoCamera | null;
  /** Sala fixa desta camera (config.py do backend). */
  salaId: string | null;
  /** Quantas aulas o modo automatico alcanca, e o total cadastrado. */
  alcanceAutomatico: { alcancadas: number; total: number } | null;
};

type Saude = {
  online: boolean;
  latenciaMs: number;
  endereco: string;
};

const OPCOES_TEMA: { valor: PreferenciaTema; rotulo: string }[] = [
  { valor: "light", rotulo: "Claro" },
  { valor: "dark", rotulo: "Escuro" },
  { valor: "sistema", rotulo: "Sistema" },
];

/** Grupo de botoes que se comporta como um radio (uma opcao vence por vez). */
function SeletorTema() {
  const { preferencia, definirPreferencia } = useTheme();

  return (
    <div
      className="inline-flex gap-0.5 rounded-sm bg-surface-2 p-0.5"
      role="radiogroup"
      aria-label="Tema"
    >
      {OPCOES_TEMA.map(({ valor, rotulo }) => {
        const ativo = preferencia === valor;
        return (
          <button
            key={valor}
            type="button"
            role="radio"
            aria-checked={ativo}
            onClick={() => definirPreferencia(valor)}
            className={`rounded-[6px] px-3 py-1.5 text-xs transition-colors ${
              ativo
                ? "bg-surface font-semibold text-primary shadow-sm"
                : "text-text-muted hover:text-text-body"
            }`}
          >
            {rotulo}
          </button>
        );
      })}
    </div>
  );
}

/** Pilula de estado, com ponto colorido. `pulsando` marca "ao vivo". */
function Pilula({
  tom,
  pulsando = false,
  children,
}: {
  tom: "ok" | "erro" | "neutro";
  pulsando?: boolean;
  children: React.ReactNode;
}) {
  const cores = {
    ok: "bg-ok-bg text-ok",
    erro: "bg-danger-bg text-danger",
    neutro: "bg-surface-2 text-text-muted",
  }[tom];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${cores}`}
    >
      <span
        className={`h-1.5 w-1.5 flex-none rounded-full bg-current ${
          pulsando ? "animate-pulse" : ""
        }`}
        aria-hidden
      />
      {children}
    </span>
  );
}

export function PainelGeral({
  turmas,
  estadoCamera,
  salaId,
  alcanceAutomatico,
}: PainelGeralProps) {
  const [turmaPadrao, setTurmaPadrao] = useState<number | null>(null);
  const [saude, setSaude] = useState<Saude | null>(null);
  const [testando, setTestando] = useState(true);

  // A preferencia so' existe no navegador (localStorage): lendo depois da
  // montagem, o HTML do servidor e o primeiro render do cliente batem.
  //
  // setTimeout(0) em vez de chamar direto no corpo do efeito: mesmo motivo do
  // vista-administracao.tsx — o lint (react-hooks/set-state-in-effect) le o
  // setState sincrono como recalculo derivavel do render, mas ler o
  // localStorage e' conversa com um sistema externo.
  useEffect(() => {
    const id = setTimeout(() => setTurmaPadrao(lerTurmaPadrao()), 0);
    return () => clearTimeout(id);
  }, []);

  const testarConexao = useCallback(async () => {
    setTestando(true);
    try {
      const resposta = await fetch("/api/saude", { cache: "no-store" });
      setSaude((await resposta.json()) as Saude);
    } catch (causa) {
      console.error("[cupcam] falha ao testar conexao:", causa);
      // A propria sonda nao respondeu: o app nao alcanca nem o proprio
      // servidor Next, entao a API certamente nao esta acessivel.
      setSaude({ online: false, latenciaMs: 0, endereco: "desconhecido" });
    } finally {
      setTestando(false);
    }
  }, []);

  // Sonda a conexao uma vez ao montar. Mesmo setTimeout(0) do efeito acima:
  // a chamada de rede e' sistema externo, nao estado derivavel do render.
  useEffect(() => {
    const id = setTimeout(() => void testarConexao(), 0);
    return () => clearTimeout(id);
  }, [testarConexao]);

  const aoTrocarTurma = (valor: string) => {
    const id = valor === "" ? null : Number(valor);
    setTurmaPadrao(id);
    definirTurmaPadrao(id);
  };

  return (
    <div>
      <Secao titulo="Aparência" descricao="Vale só neste navegador.">
        <Linha rotulo="Tema" apoio="“Sistema” acompanha o aparelho.">
          <SeletorTema />
        </Linha>
      </Secao>

      <Secao
        titulo="Preferências"
        descricao="Atalhos pro seu dia a dia. Valem só neste navegador."
      >
        <Linha
          rotulo="Turma padrão"
          apoio="Abre já nela em Chamada e Relatórios"
        >
          <select
            className="rounded-sm border border-border-default bg-surface px-2.5 py-1.5 text-sm text-text"
            value={turmaPadrao ?? ""}
            onChange={(evento) => aoTrocarTurma(evento.target.value)}
            aria-label="Turma padrão"
          >
            <option value="">Perguntar sempre</option>
            {turmas.map((turma) => (
              <option key={turma.id} value={turma.id}>
                {turma.nome}
              </option>
            ))}
          </select>
        </Linha>
      </Secao>

      {/* Antes de "Conexão" e "Sistema": estas duas sao diagnostico, e o
          assistente e' ajuste de uso, mais perto de "Preferências". */}
      <SecaoAssistente />

      <Secao titulo="Conexão" descricao="De onde o app busca os dados das aulas.">
        <Linha
          rotulo="Estado da API"
          apoio={testando ? "Verificando…" : "Verificado agora há pouco"}
        >
          {saude === null || testando ? (
            <Pilula tom="neutro">Verificando…</Pilula>
          ) : saude.online ? (
            <Pilula tom="ok" pulsando>
              No ar · {saude.latenciaMs}&nbsp;ms
            </Pilula>
          ) : (
            <Pilula tom="erro">Fora do ar</Pilula>
          )}
        </Linha>
        <Linha rotulo="Endereço" apoio="Definido no servidor">
          <ValorFixo>{saude?.endereco ?? "—"}</ValorFixo>
        </Linha>
        <Linha
          rotulo="Testar de novo"
          apoio="Use quando as telas pararem de carregar"
        >
          <button
            type="button"
            onClick={() => void testarConexao()}
            disabled={testando}
            className="rounded-sm border border-border-default bg-surface px-3.5 py-2 text-xs font-medium text-text-body transition-colors hover:bg-surface-2 disabled:opacity-50"
          >
            {testando ? "Testando…" : "Testar conexão"}
          </button>
        </Linha>
      </Secao>

      <Secao
        titulo="Sistema"
        descricao="Só leitura — para conferir quando algo não gravar."
      >
        <Linha rotulo="Sala desta câmera" apoio="Usada só no modo automático">
          <ValorFixo>{salaId ?? "—"}</ValorFixo>
        </Linha>
        <Linha rotulo="Câmera" apoio="Estado do processo de captura">
          {estadoCamera === null ? (
            <Pilula tom="neutro">Desconhecido</Pilula>
          ) : estadoCamera.rodando ? (
            <Pilula tom="ok" pulsando>
              Ligada
            </Pilula>
          ) : (
            <Pilula tom="erro">Desligada</Pilula>
          )}
        </Linha>
      </Secao>

      {/* Fica FORA do cartao "Sistema" de proposito: e' um alerta sobre a
          consequencia da sala fixa, nao mais uma linha de dado. */}
      {alcanceAutomatico !== null &&
        alcanceAutomatico.alcancadas < alcanceAutomatico.total && (
          <div className="-mt-1 mb-4 flex gap-2.5 rounded-sm bg-warn-bg px-3.5 py-3 text-xs leading-relaxed text-text-body">
            <span aria-hidden>⚠</span>
            <span>
              <strong className="text-warn">
                O modo automático alcança {alcanceAutomatico.alcancadas} de{" "}
                {alcanceAutomatico.total} aulas.
              </strong>{" "}
              Ele só encontra aulas de turmas desta sala. Para capturar as
              outras, escolha a turma na tela <strong>Câmera</strong>, ou troque{" "}
              <code className="rounded bg-surface-2 px-1 py-0.5 font-mono">
                SALA_ID
              </code>{" "}
              em{" "}
              <code className="rounded bg-surface-2 px-1 py-0.5 font-mono">
                cupcam/config.py
              </code>
              .
            </span>
          </div>
        )}
    </div>
  );
}
