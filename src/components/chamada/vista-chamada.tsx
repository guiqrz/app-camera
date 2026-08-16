"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { DetalheAluno } from "@/components/chamada/detalhe-aluno";
import { LinhaAluno } from "@/components/chamada/linha-aluno";
import { CartaoNumero } from "@/components/aulas/cartao-numero";
import { DicaAjuda } from "@/components/ui/dica-ajuda";
import {
  IconBusca,
  IconCamera,
  IconCheckSimples,
  IconPessoaAusente,
  IconPessoaPresente,
  IconSetaDireita,
  IconTendencia,
} from "@/components/ui/icons";
import { gradientePresenca } from "@/lib/cor-presenca";
import {
  dataDoTimestamp,
  formatarDataExtensa,
  formatarIntervalo,
  formatarPct,
} from "@/lib/format";
import type { AlunoChamada, ChamadaDaSessao } from "@/lib/types";

type Filtro = "todos" | "presentes" | "ausentes";

type VistaChamadaProps = {
  /** Retrato da chamada vindo do servidor no carregamento da pagina. */
  inicial: ChamadaDaSessao;
  sessaoId: number;
};

/**
 * Vista interativa da tela "Fazer Chamada".
 *
 * A lista de alunos vive em estado local e e' a fonte da verdade da tela:
 * cada clique atualiza a interface NA HORA (UI otimista) e grava em segundo
 * plano via /api/chamada. Se a gravacao falhar, o clique e' desfeito e um
 * aviso explica o que houve — o professor nunca fica olhando um spinner
 * entre um aluno e outro.
 */
export function VistaChamada({ inicial, sessaoId }: VistaChamadaProps) {
  const [alunos, setAlunos] = useState<AlunoChamada[]>(inicial.alunos);
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [raAberto, setRaAberto] = useState<string | null>(null);
  const [avisoErro, setAvisoErro] = useState<string | null>(null);
  const [emAndamento, setEmAndamento] = useState(
    inicial.sessao.encerrada_em === null,
  );

  // RAs com gravacao em voo: o poll ao vivo nao pode sobrescrever um clique
  // otimista que ainda nao chegou ao banco.
  const gravandoRef = useRef<Set<string>>(new Set());

  // Janela de desfazer do "Marcar todos presentes": guarda quem foi alterado.
  const [desfazer, setDesfazer] = useState<{ ras: string[] } | null>(null);
  const timerDesfazer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Progresso da confirmacao em lote ("Confirmando… (12/31)"). Null = parada.
  const [confirmando, setConfirmando] = useState<{
    feitos: number;
    total: number;
  } | null>(null);

  // O aviso de erro some sozinho; o timer e' limpo se outro erro chegar antes.
  const timerAviso = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mostrarErro = useCallback((mensagem: string) => {
    setAvisoErro(mensagem);
    if (timerAviso.current) clearTimeout(timerAviso.current);
    timerAviso.current = setTimeout(() => setAvisoErro(null), 6000);
  }, []);
  useEffect(() => {
    return () => {
      if (timerAviso.current) clearTimeout(timerAviso.current);
      if (timerDesfazer.current) clearTimeout(timerDesfazer.current);
    };
  }, []);

  /**
   * Marca presenca/falta com UI otimista.
   *
   * 1. Atualiza o estado local imediatamente (presente + confirmado).
   * 2. Grava via nossa rota /api/chamada.
   * 3. Se falhar, restaura o aluno exatamente como estava antes do clique.
   */
  const marcar = useCallback(
    async (ra: string, presente: boolean, silencioso = false) => {
      let anterior: AlunoChamada | undefined;

      gravandoRef.current.add(ra);
      setAlunos((atuais) =>
        atuais.map((aluno) => {
          if (aluno.ra !== ra) return aluno;
          anterior = aluno;
          return {
            ...aluno,
            presente: presente ? 1 : 0,
            confirmado_professor: 1,
          };
        }),
      );

      try {
        const resposta = await fetch(
          `/api/chamada/${sessaoId}/${encodeURIComponent(ra)}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ presente }),
          },
        );
        if (!resposta.ok) throw new Error(`status ${resposta.status}`);
        return true;
      } catch (causa) {
        console.error("[cupcam] falha ao gravar presenca:", causa);
        // Desfaz o clique: devolve o aluno ao estado anterior.
        setAlunos((atuais) =>
          atuais.map((aluno) =>
            aluno.ra === ra && anterior ? anterior : aluno,
          ),
        );
        // `silencioso` na confirmacao em lote: com 3 falhas o aviso piscaria 3
        // vezes e seria sobrescrito pelo resumo no fim. Quem chama em lote
        // conta as falhas e avisa UMA vez, com o numero certo.
        if (!silencioso) {
          mostrarErro(
            "Não foi possível salvar a presença. Verifique a conexão e tente de novo.",
          );
        }
        return false;
      } finally {
        gravandoRef.current.delete(ra);
      }
    },
    [sessaoId, mostrarErro],
  );

  /**
   * Chamada ao vivo: enquanto a aula esta em andamento, busca o retrato novo
   * a cada 15s — a camera vai detectando alunos e a lista acompanha sozinha.
   *
   * O dado do servidor vence, EXCETO para alunos com clique otimista em voo
   * (gravandoRef), que mantem o estado local ate a gravacao terminar.
   */
  useEffect(() => {
    if (!emAndamento) return;

    const intervalo = setInterval(async () => {
      try {
        const resposta = await fetch(`/api/chamada/${sessaoId}`);
        if (!resposta.ok) return; // falha de rede: tenta de novo no proximo tique
        const dados = (await resposta.json()) as ChamadaDaSessao;

        setAlunos((locais) =>
          dados.alunos.map((doServidor) => {
            if (!gravandoRef.current.has(doServidor.ra)) return doServidor;
            return (
              locais.find((aluno) => aluno.ra === doServidor.ra) ?? doServidor
            );
          }),
        );

        // A aula encerrou no meio do caminho: para o poll.
        if (dados.sessao.encerrada_em !== null) setEmAndamento(false);
      } catch (causa) {
        // Sem aviso na tela: e' atualizacao de fundo, o professor nao pediu.
        console.error("[cupcam] falha na atualizacao ao vivo:", causa);
      }
    }, 15_000);

    return () => clearInterval(intervalo);
  }, [emAndamento, sessaoId]);

  /**
   * Marca presentes todos os que estao como ausentes, um POST por aluno, e
   * abre a janela de desfazer: um clique em massa errado nao pode obrigar o
   * professor a reverter aluno por aluno.
   */
  const marcarTodosPresentes = useCallback(() => {
    const ausentes = alunos.filter((aluno) => aluno.presente === 0);
    if (ausentes.length === 0) return;

    setDesfazer({ ras: ausentes.map((aluno) => aluno.ra) });
    if (timerDesfazer.current) clearTimeout(timerDesfazer.current);
    timerDesfazer.current = setTimeout(() => setDesfazer(null), 8000);

    // Disparos em paralelo: cada um ja e' otimista e se desfaz sozinho.
    ausentes.forEach((aluno) => void marcar(aluno.ra, true));
  }, [alunos, marcar]);

  /** Desfaz o "marcar todos": devolve pra ausente so' quem o clique mudou. */
  const desfazerMarcarTodos = useCallback(() => {
    if (!desfazer) return;
    desfazer.ras.forEach((ra) => void marcar(ra, false));
    setDesfazer(null);
    if (timerDesfazer.current) clearTimeout(timerDesfazer.current);
  }, [desfazer, marcar]);

  /**
   * Confirma a chamada INTEIRA, respeitando a lista como ela esta.
   *
   * Diferente de "Marcar todos presentes": aqui ninguem muda de estado —
   * presente continua presente, AUSENTE CONTINUA AUSENTE. O que a acao faz e'
   * carimbar `confirmado_professor` em todos, ou seja, o professor assume a
   * lista como dele. Marcar presente quem faltou seria justamente o erro que
   * uma chamada nao pode cometer.
   *
   * SERIALIZADO, e nao em paralelo: aqui pode ser a turma inteira de uma vez, e
   * 30 POSTs simultaneos contra um SQLite dao "database is locked". O
   * "Marcar todos presentes" continua paralelo porque so' toca nos ausentes e
   * ja' era assim.
   */
  const confirmarChamada = useCallback(async () => {
    // Quem ja' foi confirmado nao precisa de outra requisicao.
    const pendentes = alunos.filter((aluno) => aluno.confirmado_professor !== 1);
    if (pendentes.length === 0) return;

    setConfirmando({ feitos: 0, total: pendentes.length });
    let falhas = 0;

    for (const [indice, aluno] of pendentes.entries()) {
      const ok = await marcar(aluno.ra, aluno.presente === 1, true);
      if (!ok) falhas += 1;
      setConfirmando({ feitos: indice + 1, total: pendentes.length });
    }

    setConfirmando(null);
    // Falha parcial e' DECLARADA: dizer "pronto" escondendo 3 alunos que nao
    // gravaram faria o professor pensar que a chamada esta fechada.
    if (falhas > 0) {
      mostrarErro(
        falhas === 1
          ? "1 aluno não foi confirmado. Verifique a conexão e tente de novo."
          : `${falhas} alunos não foram confirmados. Verifique a conexão e tente de novo.`,
      );
    }
  }, [alunos, marcar, mostrarErro]);

  /* --- Numeros derivados do estado local (reagem a cada clique) --- */

  const total = alunos.length;
  const presentes = alunos.filter((aluno) => aluno.presente === 1).length;
  const ausentes = total - presentes;
  const detectados = alunos.filter(
    (aluno) => aluno.detectado_automaticamente === 1,
  ).length;
  const presencaPct = total > 0 ? Math.round((100 * presentes) / total) : null;
  const mediaHistoricaPct = inicial.comparativo.media_historica_pct;

  // A chamada esta confirmada quando NENHUM aluno ficou sem o carimbo do
  // professor. Turma vazia nao conta como confirmada: nao ha o que assumir.
  const naoConfirmados = alunos.filter(
    (aluno) => aluno.confirmado_professor !== 1,
  ).length;
  const chamadaConfirmada = total > 0 && naoConfirmados === 0;

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return alunos.filter((aluno) => {
      if (termo && !aluno.nome.toLowerCase().includes(termo)) return false;
      if (filtro === "presentes" && aluno.presente !== 1) return false;
      if (filtro === "ausentes" && aluno.presente !== 0) return false;
      return true;
    });
  }, [alunos, busca, filtro]);

  const alunoAberto = raAberto
    ? (alunos.find((aluno) => aluno.ra === raAberto) ?? null)
    : null;

  /* --- View Detalhe do aluno --- */

  if (alunoAberto) {
    return (
      <DetalheAluno
        aluno={alunoAberto}
        nomeTurma={inicial.sessao.turma}
        aoMarcar={marcar}
        aoVoltar={() => setRaAberto(null)}
        avisoErro={avisoErro}
      />
    );
  }

  /* --- View Lista --- */

  const dataAula = formatarDataExtensa(dataDoTimestamp(inicial.sessao.iniciada_em));

  // Materia e horario vem da aula da grade e sao nulos quando a sessao nao tem
  // aula associada (camera ligada na mao, ou aula excluida depois): a linha
  // encolhe pra turma + data, sem placeholder no lugar do dado ausente.
  const identificacao = [
    inicial.sessao.turma,
    inicial.sessao.materia,
    formatarIntervalo(inicial.sessao.hora_inicio, inicial.sessao.hora_fim),
    dataAula,
  ]
    .filter(Boolean)
    .join(" · ");

  const FILTROS: { chave: Filtro; rotulo: string }[] = [
    { chave: "todos", rotulo: "Todos" },
    { chave: "presentes", rotulo: "Presentes" },
    { chave: "ausentes", rotulo: "Ausentes" },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* Cabecalho: turma, materia, horario e data. Materia e horario somem
          quando a sessao nao tem aula associada — sem placeholder no lugar. */}
      <div>
        <p className="text-text-body m-0 flex flex-wrap items-center gap-2 text-[13px]">
          {identificacao}
          {emAndamento && (
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10.5px] font-semibold tracking-wide uppercase"
              style={{ background: "var(--ok-bg)", color: "var(--ok-fg)" }}
            >
              <span
                className="h-1.5 w-1.5 animate-pulse rounded-full"
                style={{ background: "var(--ok)" }}
                aria-hidden
              />
              Ao vivo
            </span>
          )}
        </p>
      </div>

      {avisoErro && <AvisoErro mensagem={avisoErro} />}

      {desfazer && (
        <div
          role="status"
          className="flex flex-wrap items-center gap-3 rounded-[12px] px-4 py-3"
          style={{ background: "var(--ok-bg)", color: "var(--ok-fg)" }}
        >
          <span className="text-[13px] font-semibold">
            {desfazer.ras.length === 1
              ? "1 aluno marcado como presente."
              : `${desfazer.ras.length} alunos marcados como presentes.`}
          </span>
          <button
            type="button"
            onClick={desfazerMarcarTodos}
            className="ml-auto rounded-lg px-3 py-1.5 text-[12.5px] font-semibold underline underline-offset-2"
          >
            Desfazer
          </button>
        </div>
      )}

      {/* ---- NUMEROS ----
          No topo, como nas outras telas: sao o motivo de abrir a chamada.
          Reagem a cada clique na lista, porque saem do estado local. */}
      <div className="numeros-cam">
        <CartaoNumero
          rotulo="Presentes"
          cor="verde"
          valor={
            <>
              {presentes}
              <span className="text-text-muted text-[22px]">/{total}</span>
            </>
          }
          nota="Presentes nesta aula"
          icone={<IconPessoaPresente size={18} />}
        />
        <CartaoNumero
          rotulo="Ausentes"
          cor="ambar"
          valor={ausentes}
          nota="Sem presença registrada"
          icone={<IconPessoaAusente size={18} />}
        />
        <CartaoNumero
          rotulo="Presença hoje"
          cor="roxo"
          valor={formatarPct(presencaPct) ?? "—"}
          nota={
            mediaHistoricaPct === null
              ? "Primeira aula desta turma"
              : `Média da turma: ${formatarPct(mediaHistoricaPct)}`
          }
          icone={<IconTendencia size={18} />}
        />
        {/* Discreto: quantos a câmera achou sozinha é diagnóstico do
            reconhecimento, não métrica pedagógica. */}
        <CartaoNumero
          discreto
          rotulo="Detectados pela câmera"
          cor="azul"
          valor={
            <>
              {detectados}
              <span className="text-text-muted text-[14px]">/{total}</span>
            </>
          }
          nota="Sem precisar de chamada manual"
          icone={<IconCamera size={16} />}
        />
      </div>

      {/* ---- ESTADO DA CONFIRMACAO ----
          A chamada só é do professor quando ele assume a lista. Enquanto isso
          não acontece, a faixa fica âmbar (pendência, não erro). */}
      <div
        className="chamada-estado"
        data-confirmada={chamadaConfirmada ? "sim" : "nao"}
        role="status"
      >
        <span className="chamada-estado-texto">
          {chamadaConfirmada
            ? "Chamada confirmada por você."
            : confirmando
              ? `Confirmando… (${confirmando.feitos}/${confirmando.total})`
              : naoConfirmados === total
                ? "Chamada ainda não confirmada."
                : `${naoConfirmados} ${naoConfirmados === 1 ? "aluno ainda não confirmado" : "alunos ainda não confirmados"}.`}
        </span>

        {!chamadaConfirmada && total > 0 && (
          <button
            type="button"
            onClick={() => void confirmarChamada()}
            disabled={confirmando !== null}
            className="btn-acao vidro"
          >
            <IconCheckSimples size={14} />
            {confirmando ? "Confirmando…" : "Confirmar chamada"}
          </button>
        )}
      </div>

      {/* ---- COMPARATIVO ---- */}
      <section className="border-border-default bg-surface shadow-card bloco-cam rounded-[12px] border">
        <div className="bloco-cam-topo">
          <span className="bloco-cam-rotulo">Comparativo da turma</span>
          <span className="bloco-cam-ajuda">
            <DicaAjuda
              texto="Compara a presença de hoje com a média das outras aulas desta turma. É presença, não engajamento — atenção da turma nunca é medida por aluno."
              rotulo="Como o comparativo é calculado"
              lado="esquerda"
            />
          </span>
        </div>
        {/* Sem `cor` fixa: a barra pega a cor da propria porcentagem, igual a'
            barrinha de frequencia da lista (ele pediu em 16/08). Antes eram
            duas cores de MARCA — roxo e ciano — que distinguiam as duas
            linhas mas nao diziam nada sobre o numero: 25% e 95% saiam do
            mesmo roxo. */}
        <BarraComparativo rotulo="Hoje" pct={presencaPct} />
        <BarraComparativo
          rotulo="Média das últimas aulas"
          pct={mediaHistoricaPct}
        />
      </section>

      {/* ---- BUSCA, FILTROS E ACOES ---- */}
      <div className="chamada-acoes">
        <label className="busca">
          <IconBusca size={13} />
          <span className="sr-only">Buscar aluno por nome</span>
          <input
            value={busca}
            onChange={(evento) => setBusca(evento.target.value)}
            placeholder="Buscar aluno por nome…"
            type="search"
            autoComplete="off"
          />
        </label>

        <div className="chamada-filtros" role="group" aria-label="Filtrar alunos">
          {FILTROS.map(({ chave, rotulo }) => (
            <button
              key={chave}
              type="button"
              onClick={() => setFiltro(chave)}
              aria-pressed={filtro === chave}
              className="chamada-filtro"
            >
              {rotulo}
            </button>
          ))}
        </div>

        {/* Secundário de propósito: marcar todos PRESENTES muda quem faltou —
            é a mais perigosa das duas ações, e não a que fecha a chamada. */}
        <button
          type="button"
          onClick={marcarTodosPresentes}
          disabled={ausentes === 0 || confirmando !== null}
          className="btn-acao"
        >
          Marcar todos presentes
        </button>
      </div>

      {/* ---- LISTA ---- */}
      <div className="chamada-lista">
        <div className="chamada-cabecalho" aria-hidden>
          <span>Aluno</span>
          <span>Presença nesta aula</span>
          <span>Frequência</span>
          <span />
        </div>

        {filtrados.length === 0 ? (
          <p className="chamada-vazio">
            {alunos.length === 0
              ? "Nenhum aluno matriculado nesta turma."
              : "Nenhum aluno encontrado com esse filtro."}
          </p>
        ) : (
          <ul>
            {filtrados.map((aluno) => (
              <LinhaAluno
                key={aluno.ra}
                aluno={aluno}
                aoMarcar={marcar}
                aoAbrirDetalhe={() => setRaAberto(aluno.ra)}
                ocupado={confirmando !== null}
              />
            ))}
          </ul>
        )}
      </div>

      {/* Contagem para leitor de tela: os números acima mudam sozinhos a cada
          clique, e sem isto a mudança seria silenciosa. */}
      <span className="sr-only" role="status" aria-live="polite">
        {presentes} de {total} alunos presentes.
      </span>

      <Link
        href={`/relatorios/sessao/${sessaoId}`}
        className="btn-acao vidro self-end no-underline"
      >
        Concluir e ver relatório
        <IconSetaDireita size={13} />
      </Link>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Pecas internas da vista                                             */
/* ------------------------------------------------------------------ */

function AvisoErro({ mensagem }: { mensagem: string }) {
  return (
    <p
      role="alert"
      className="rounded-xl px-4 py-3 text-sm font-semibold"
      style={{ background: "var(--danger-bg)", color: "var(--danger-fg)" }}
    >
      {mensagem}
    </p>
  );
}

/**
 * Uma barra do comparativo (hoje x media historica).
 *
 * A cor sai da PORCENTAGEM, pelas mesmas faixas da barrinha de frequencia
 * (`gradientePresenca`/`corPresenca`) — as duas leem presenca, e a mesma
 * porcentagem tem que sair da mesma cor nos dois lugares. O trilho e' de
 * VIDRO (`.chamada-barra-trilho`), igual ao "Chamada automática" do
 * relatorio de sessao — ele pediu igualar em 16/08.
 *
 * `null` mostra "—" e barra vazia — e' diferente de 0%, que seria "medimos e
 * ninguem veio".
 */
function BarraComparativo({
  rotulo,
  pct,
}: {
  rotulo: string;
  pct: number | null;
}) {
  return (
    <div className="chamada-barra-linha">
      <span className="chamada-barra-rotulo">{rotulo}</span>
      <span className="chamada-barra-trilho" aria-hidden>
        <span
          className="chamada-barra-preenchida"
          style={{ width: `${pct ?? 0}%`, background: gradientePresenca(pct) }}
        />
      </span>
      <span className="chamada-barra-valor">
        {formatarPct(pct) ?? "—"}
      </span>
    </div>
  );
}

