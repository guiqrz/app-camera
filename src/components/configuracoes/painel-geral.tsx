"use client";

import { useCallback, useEffect, useState } from "react";

import { SecaoAssistente } from "@/components/configuracoes/secao-assistente";
import {
  Aviso,
  GrupoTitulo,
  Linha,
  Linhas,
  Pilula,
  Secao,
  Selo,
  ValorFixo,
} from "@/components/configuracoes/secao";
import {
  useTheme,
  type PreferenciaTema,
} from "@/components/theme/theme-provider";
import {
  IconCadeado,
  IconCamera,
  IconLua,
  IconSol,
  IconTurma,
} from "@/components/ui/icons";
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
    <div className="cfg-tema" role="radiogroup" aria-label="Tema">
      {OPCOES_TEMA.map(({ valor, rotulo }) => (
        <button
          key={valor}
          type="button"
          role="radio"
          className="cfg-tema-opcao"
          aria-checked={preferencia === valor}
          onClick={() => definirPreferencia(valor)}
        >
          {rotulo}
        </button>
      ))}
    </div>
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
  const { theme } = useTheme();

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

  const alcanceIncompleto =
    alcanceAutomatico !== null &&
    alcanceAutomatico.alcancadas < alcanceAutomatico.total;

  return (
    <div>
      {/* ---- O que a pessoa escolhe ---- */}
      <GrupoTitulo>Preferências</GrupoTitulo>

      <Secao
        titulo="Aparência e atalhos"
        descricao="Valem só neste navegador — cada aparelho tem os seus."
      >
        <Linhas>
          <Linha
            rotulo="Tema"
            apoio="“Sistema” acompanha o aparelho."
            icone={theme === "dark" ? <IconLua size={15} /> : <IconSol size={15} />}
          >
            <SeletorTema />
          </Linha>

          <Linha
            rotulo="Turma padrão"
            apoio="Abre já nela em Chamada e Relatórios."
            icone={<IconTurma size={15} />}
          >
            <select
              className="cfg-select"
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

          {/* Era uma ABA travada, que gastava um terco da barra pra dizer que
              nao existe. Como linha, responde a mesma pergunta de quem veio
              procurar a senha, sem ocupar a navegacao. */}
          <Linha
            rotulo="Conta e senha"
            apoio="O CUPCAM não tem login: o app fala com a API por uma chave que fica no servidor."
            icone={<IconCadeado size={15} />}
            inerte
          >
            <Selo>Em breve</Selo>
          </Linha>
        </Linhas>
      </Secao>

      <SecaoAssistente />

      {/* ---- O que o sistema esta fazendo ----
          Conexao e Sistema eram dois cartoes separados respondendo a mesma
          pergunta ("o que esta ligado?"), e o aviso do SALA_ID flutuava solto
          embaixo dos dois. Agora sao um painel, com o aviso preso ao pe. */}
      <GrupoTitulo>Diagnóstico</GrupoTitulo>

      <Secao
        titulo="Estado do sistema"
        descricao="Só leitura. É o que conferir quando alguma tela parar de carregar ou algo não gravar."
      >
        <Linhas>
          <Linha
            rotulo="API"
            apoio={
              testando
                ? "Verificando…"
                : "De onde o app busca os dados das aulas."
            }
          >
            {saude === null || testando ? (
              <Pilula tom="neutro">Verificando…</Pilula>
            ) : saude.online ? (
              <Pilula tom="ok" vivo>
                No ar · {saude.latenciaMs}&nbsp;ms
              </Pilula>
            ) : (
              <Pilula tom="erro">Fora do ar</Pilula>
            )}
          </Linha>

          <Linha rotulo="Endereço" apoio="Definido no servidor.">
            <ValorFixo>{saude?.endereco ?? "—"}</ValorFixo>
          </Linha>

          <Linha
            rotulo="Câmera"
            apoio="Estado do processo de captura."
            icone={<IconCamera size={15} />}
          >
            {estadoCamera === null ? (
              <Pilula tom="neutro">Desconhecido</Pilula>
            ) : estadoCamera.rodando ? (
              <Pilula tom="ok" vivo>
                Ligada
              </Pilula>
            ) : (
              <Pilula tom="erro">Desligada</Pilula>
            )}
          </Linha>

          <Linha
            rotulo="Sala desta câmera"
            apoio="Usada só no modo automático."
          >
            <ValorFixo>{salaId ?? "—"}</ValorFixo>
          </Linha>

          <Linha
            rotulo="Testar de novo"
            apoio="Use quando as telas pararem de carregar."
          >
            <button
              type="button"
              onClick={() => void testarConexao()}
              disabled={testando}
              className="btn-acao vidro"
            >
              {testando ? "Testando…" : "Testar conexão"}
            </button>
          </Linha>
        </Linhas>

        {alcanceIncompleto && (
          <Aviso>
            <strong>
              O modo automático alcança {alcanceAutomatico.alcancadas} de{" "}
              {alcanceAutomatico.total} aulas.
            </strong>{" "}
            Ele só encontra aulas de turmas desta sala. Para capturar as outras,
            escolha a turma na tela <strong>Câmera</strong>, ou troque{" "}
            <code>SALA_ID</code> em <code>cupcam/config.py</code>.
          </Aviso>
        )}
      </Secao>
    </div>
  );
}
