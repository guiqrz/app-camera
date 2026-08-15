"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { IconBusca, IconFechar, IconSeta } from "@/components/ui/icons";
import type { AulaCard } from "@/lib/types";

/**
 * As 4 opcoes do menu de visualizacao.
 *
 * ⚠️ A NUMERACAO TEM BURACOS DE PROPOSITO. Os estilos 1, 2, 3, 6, 8 e 9 foram
 * rejeitados ao longo do desenho; o "5" e' o mesmo 5 que ele viu e aprovou.
 * Renumerar pra 1-2-3 faria "prefiro o 5" apontar pra outro layout na conversa
 * seguinte.
 */
const VISUAIS = [
  { id: "5", nome: "Cards v5", dica: "Número à esquerda" },
  { id: "7", nome: "Cards v7", dica: "Com barra de medida" },
  { id: "4", nome: "Cards v4", dica: "Número no centro" },
  { id: "mes", nome: "Por mês", dica: "Agrupado por mês" },
] as const;

type Visual = (typeof VISUAIS)[number]["id"];

/**
 * Chave NOVA de proposito.
 *
 * A antiga (`cupcam:relatorios:modo`, valores "a"/"b") foi abandonada: "b"
 * significava "Por mes" e nao casa com nenhum valor do vocabulario novo — o
 * professor abriria em cards sem entender por que.
 */
const CHAVE_VISUAL = "cupcam:relatorios:visual";

/** As 4 cores de materia do prototipo, atribuidas por posicao estavel. */
const CORES_MATERIA = ["azul", "roxo", "ambar", "verde"] as const;

const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

const MES_CURTO = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez",
];

/**
 * "AAAA-MM-DD" -> "07 ago". Fatia a string, nao usa `new Date`.
 *
 * `new Date("2026-08-07")` e' meia-noite UTC, e no fuso do Brasil (-03) volta
 * pro dia 6 — o card mostraria a data errada em metade do dia.
 */
function formatarDataCurta(iso: string) {
  const [, mes, dia] = iso.split("-");
  return `${dia} ${MES_CURTO[Number(mes) - 1] ?? mes}`;
}

function mesDaData(iso: string) {
  return iso.slice(0, 7);
}

function rotuloDoMes(chave: string) {
  const [ano, mes] = chave.split("-");
  return `${MESES[Number(mes) - 1] ?? mes} de ${ano}`;
}

/** Só o nome do mês ("Agosto"), como o cabeçalho de grupo do protótipo. */
function nomeDoMes(chave: string) {
  const [, mes] = chave.split("-");
  const nome = MESES[Number(mes) - 1] ?? mes;
  return nome.charAt(0).toUpperCase() + nome.slice(1);
}

type Props = {
  aulas: AulaCard[];
  turmaId: number;
};

/**
 * A grade de aulas da tela Relatorios — busca, filtros e as 4 visualizacoes.
 *
 * Aula sem leitura mostra TRAVESSAO, nunca 0%: zero afirma "ninguem prestou
 * atencao", e o fato e' "nao foi medido". No estilo 7 isso tambem apaga a
 * barra — uma barra a 0% seria a mesma mentira em forma de grafico.
 */
export function GradeAulas({ aulas, turmaId }: Props) {
  const [busca, setBusca] = useState("");
  const [materia, setMateria] = useState("");
  const [mes, setMes] = useState("");
  const [visual, setVisual] = useState<Visual>("5");
  const [menuAberto, setMenuAberto] = useState(false);

  // Le a preferencia depois da montagem: `localStorage` nao existe no
  // servidor, e ler no primeiro render do cliente daria hidratacao divergente.
  useEffect(() => {
    const id = setTimeout(() => {
      const salvo = localStorage.getItem(CHAVE_VISUAL);
      if (salvo && VISUAIS.some((v) => v.id === salvo)) {
        setVisual(salvo as Visual);
      }
    }, 0);
    return () => clearTimeout(id);
  }, []);

  // Esc fecha o menu — o mesmo atalho de qualquer painel sobreposto.
  useEffect(() => {
    if (!menuAberto) return;
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuAberto(false);
    };
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [menuAberto]);

  // Cor por materia, atribuida por POSICAO na lista ordenada de materias
  // reais. Estavel entre renders e independente da ordem das aulas: a mesma
  // materia nao troca de cor quando um filtro muda.
  const corPorMateria = useMemo(() => {
    const nomes = [
      ...new Set(aulas.map((a) => a.materia).filter((m): m is string => !!m)),
    ].sort();
    return new Map(
      nomes.map((nome, i) => [nome, CORES_MATERIA[i % CORES_MATERIA.length]]),
    );
  }, [aulas]);

  const materias = useMemo(
    () => [...corPorMateria.keys()],
    [corPorMateria],
  );

  const meses = useMemo(
    () => [...new Set(aulas.map((a) => mesDaData(a.data)))].sort().reverse(),
    [aulas],
  );

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return aulas.filter((a) => {
      if (materia && a.materia !== materia) return false;
      if (mes && mesDaData(a.data) !== mes) return false;
      if (!termo) return true;
      // Busca no que o professor VE no card: titulo, materia e resumo.
      const alvo = `${a.titulo ?? ""} ${a.materia ?? ""} ${
        a.conteudo_resumo ?? ""
      } ${a.resumo ?? ""} ${a.dia_semana}`;
      return alvo.toLowerCase().includes(termo);
    });
  }, [aulas, busca, materia, mes]);

  const temFiltro = Boolean(busca.trim() || materia || mes);

  // Quantas das aulas listadas tem leitura de engajamento — o "6 com conteúdo
  // registrado" do prototipo. Conta sobre as FILTRADAS, senao o numero
  // descreveria uma lista que nao esta na tela.
  const comRegistro = filtradas.filter(
    (a) => a.engajamento_pct !== null,
  ).length;

  function escolherVisual(id: Visual) {
    setVisual(id);
    setMenuAberto(false);
    localStorage.setItem(CHAVE_VISUAL, id);
  }

  const visualAtual = VISUAIS.find((v) => v.id === visual) ?? VISUAIS[0];

  return (
    // SEM CARD DE FUNDO. Ele pediu em 10/08 ("na barra de pesquisa lá em cima
    // ela fica dentro de um card, não quero que tenha esse card de fundo") e
    // repetiu em 15/08 sobre os cards de aula. No artifact esta faixa nao tem
    // moldura nenhuma: cada campo se sustenta sozinho contra o fundo da
    // pagina, e a grade fica direto sobre `.miolo`.
    //
    // Um painel de vidro aqui tambem QUEBRA o cabecalho sticky de "Por mes":
    // o gradiente dele desbota para `var(--bg)`, a cor da PAGINA, que so' e'
    // a cor real por tras quando nao ha' vidro no meio. Dentro do painel a
    // mesma cor virava uma chapa opaca — a faixa escura que ele reportou.
    <div className="flex flex-col gap-[13px]">
      {/* .filtros: gap 9px, padding SO' lateral (17px) — o respiro vertical
          vem do gap do miolo. Ele decidiu que barra de filtro e' CONTROLE,
          nao conteudo, entao ela nao ganha moldura propria. */}
      <div className="flex flex-wrap items-center gap-[9px] px-[17px]">
        <label
          className="border-border-default bg-surface flex min-w-0 flex-1 basis-[240px] items-center gap-2 rounded-[9px] border px-[13px] py-[9px]"
          style={{ backdropFilter: "var(--blur-card)" }}
        >
          <span className="text-text-muted flex-none" aria-hidden>
            <IconBusca size={14} />
          </span>
          <span className="sr-only">Buscar aula</span>
          <input
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar aula por título ou assunto"
            className="text-text placeholder:text-text-muted min-w-0 flex-1 bg-transparent text-[13px] font-medium outline-none"
          />
        </label>

        <FiltroSelect
          rotulo="Filtrar por matéria"
          valor={materia}
          aoMudar={setMateria}
          opcoes={[
            { valor: "", texto: "Todas as matérias" },
            ...materias.map((m) => ({ valor: m, texto: m })),
          ]}
        />

        <FiltroSelect
          rotulo="Filtrar por mês"
          valor={mes}
          aoMudar={setMes}
          opcoes={[
            { valor: "", texto: "Todos os meses" },
            ...meses.map((m) => ({ valor: m, texto: rotuloDoMes(m) })),
          ]}
        />

        {/* So' aparece quando ha o que limpar: um botao permanentemente
            inerte ensina o professor a ignorar aquele canto da tela. */}
        {temFiltro && (
          <button
            type="button"
            onClick={() => {
              setBusca("");
              setMateria("");
              setMes("");
            }}
            className="text-text-muted hover:text-text flex items-center gap-[5px] rounded-[9px] border border-transparent px-3 py-[9px] text-[12.5px] font-semibold transition-colors"
          >
            <IconFechar size={13} />
            Limpar
          </button>
        )}

        <div className="relative">
          {/* z-30 mantem o botao ACIMA do veu que fecha o menu (z-20): sem
              isso o clique para reabrir cai no veu, que fecha antes — o menu
              piscava e nunca abria. */}
          <button
            type="button"
            onClick={() => setMenuAberto((a) => !a)}
            aria-haspopup="menu"
            aria-expanded={menuAberto}
            className="border-border-default text-text relative z-30 inline-flex items-center gap-[7px] rounded-[10px] border py-2 pr-[11px] pl-3 text-[12.5px] font-semibold"
            style={{ background: "var(--surface-2)", lineHeight: "normal" }}
          >
            <IconGrade />
            {visualAtual.nome}
            <span className="text-text-muted" aria-hidden>
              <IconSeta size={12} />
            </span>
          </button>

          {menuAberto && (
            <>
              {/* Captura o clique fora sem escurecer a tela: o menu e' leve,
                  um veu preto aqui seria pesado demais pro gesto. */}
              <div
                className="fixed inset-0 z-20"
                onClick={() => setMenuAberto(false)}
                aria-hidden
              />
              {/* ⚠️ FUNDO OPACO (--painel-solido), nao --surface: os cards da
                  grade passam por baixo do menu, e com fundo semitransparente
                  o texto das opcoes fica ilegivel sobre eles. Com fundo opaco
                  nao ha o que borrar, entao tambem nao leva blur. */}
              <div
                role="menu"
                className="border-border-default absolute top-[calc(100%+6px)] right-0 z-30 min-w-[208px] rounded-[13px] border p-[5px]"
                style={{
                  background: "var(--painel-solido)",
                  boxShadow: "var(--shadow-raise)",
                }}
              >
                {VISUAIS.map((v) => {
                  const marcado = v.id === visual;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      role="menuitemradio"
                      aria-checked={marcado}
                      onClick={() => escolherVisual(v.id)}
                      className="hover:bg-surface-2 flex w-full flex-col items-start rounded-[9px] px-2.5 py-[7px] text-left transition-colors"
                      style={
                        marcado
                          ? {
                              background: "var(--primary)",
                              color: "var(--text-on-brand)",
                            }
                          : undefined
                      }
                    >
                      <span className="text-[12.5px] font-semibold">
                        {v.nome}
                      </span>
                      <span
                        className="text-[10.5px]"
                        style={{
                          color: marcado
                            ? "var(--text-on-brand)"
                            : "var(--text-muted)",
                          opacity: marcado ? 0.78 : 1,
                        }}
                      >
                        {v.dica}
                      </span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      <p
        className="text-text-body ml-[17px] flex flex-wrap items-baseline gap-2 text-[13px]"
        style={{ fontWeight: 400 }}
      >
        <b className="text-text font-semibold">{filtradas.length}</b>
        {filtradas.length === 1 ? "aula" : "aulas"}
        <span className="text-text-muted" aria-hidden>
          ·
        </span>
        {temFiltro ? (
          <span className="text-text-muted">de {aulas.length} no total</span>
        ) : (
          <>
            <b className="text-text font-semibold">{comRegistro}</b>
            <span className="text-text-muted">com conteúdo registrado</span>
          </>
        )}
      </p>

      {filtradas.length === 0 ? (
        <p className="text-text-muted px-[17px] py-6 text-center text-[13px]">
          Nenhuma aula encontrada com esses filtros.
        </p>
      ) : visual === "mes" ? (
        <PorMes
          aulas={filtradas}
          turmaId={turmaId}
          corPorMateria={corPorMateria}
        />
      ) : (
        <Grade
          aulas={filtradas}
          turmaId={turmaId}
          corPorMateria={corPorMateria}
          estilo={visual}
        />
      )}
    </div>
  );
}

/** Um `<select>` embrulhado com a moldura do prototipo (.filtro). */
function FiltroSelect({
  rotulo,
  valor,
  aoMudar,
  opcoes,
}: {
  rotulo: string;
  valor: string;
  aoMudar: (v: string) => void;
  opcoes: { valor: string; texto: string }[];
}) {
  return (
    <label
      className="border-border-default bg-surface flex items-center gap-[6px] rounded-[9px] border px-3 py-[9px]"
      style={{ backdropFilter: "var(--blur-card)" }}
    >
      <span className="sr-only">{rotulo}</span>
      <select
        value={valor}
        onChange={(e) => aoMudar(e.target.value)}
        className="text-text cursor-pointer appearance-none bg-transparent text-[12.5px] font-semibold outline-none"
      >
        {opcoes.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.texto}
          </option>
        ))}
      </select>
      <span className="text-text-muted flex-none" aria-hidden>
        <IconSeta size={12} />
      </span>
    </label>
  );
}

/** O icone de 4 quadrados do botao de visualizacao. */
function IconGrade() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}

type GradeProps = {
  aulas: AulaCard[];
  turmaId: number;
  corPorMateria: Map<string, string>;
  estilo: "4" | "5" | "7";
};

function Grade({ aulas, turmaId, corPorMateria, estilo }: GradeProps) {
  return (
    <div
      className="grid gap-[13px] px-[17px]"
      style={{ gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}
    >
      {aulas.map((aula) => (
        <CartaoDaAula
          key={aula.sessao_id}
          aula={aula}
          turmaId={turmaId}
          cor={aula.materia ? corPorMateria.get(aula.materia) : undefined}
          estilo={estilo}
        />
      ))}
    </div>
  );
}

/**
 * VERSAO B do protótipo — agrupado por mês, em LISTA (`.lista-meses`).
 *
 * Não é a grade com um título em cima: a ideia é que o professor procura aula
 * pelo QUANDO ("aquela de julho"), então o mês vira a estrutura da tela e cada
 * aula é uma linha baixa — cabe muito mais na altura. Sem card por aula, sem
 * sombra, sem barra de progresso: o que separa é um risco fino e o espaço.
 *
 * Antes isto reusava `<Grade estilo="7">`, ou seja, desenhava CARDS — ele
 * apontou a divergência em 14/08.
 */
function PorMes({
  aulas,
  turmaId,
  corPorMateria,
}: Omit<GradeProps, "estilo">) {
  // Agrupa preservando a ordem de chegada (a API ja devolve da mais recente
  // pra mais antiga), entao os meses saem em ordem sem precisar reordenar.
  const grupos = new Map<string, AulaCard[]>();
  for (const aula of aulas) {
    const chave = mesDaData(aula.data);
    const lista = grupos.get(chave);
    if (lista) lista.push(aula);
    else grupos.set(chave, [aula]);
  }

  return (
    <div className="flex flex-col gap-[22px] px-[17px]">
      {[...grupos.entries()].map(([chave, doMes]) => {
        const comConteudo = doMes.filter((a) => a.titulo !== null).length;

        return (
          <section key={chave} className="flex flex-col gap-[2px]">
            {/* Cabeçalho STICKY: rolando uma lista longa, o professor nunca
                perde de vista em que mês está. Antes o fundo era um gradiente
                pra cor SOLIDA da pagina (`var(--bg)`), que criava uma faixa
                opaca — ele apontou em 15/08 que ficava chapada contra a
                atmosfera translucida ao redor, nos dois temas (o mesmo bug
                existe no artifact; ele pediu pra corrigir aqui sem usar o
                artifact de referencia nisso).

                Fix: tratar como VIDRO — mesma receita de `.card`/`.busca`
                (fundo translucido + blur) em vez de cor solida. O
                `backdrop-filter` borra a linha que passa por baixo (resolve
                o motivo original do gradiente) e o `--card` translucido deixa
                a atmosfera atravessar em vez de tapar — sem criar uma chapa
                que destoa do resto da tela, que e' vidro em toda parte. */}
            <h3
              className="text-text sticky top-0 z-[2] flex items-baseline gap-[9px] rounded-[var(--radius-sm)] px-[3px] pt-[7px] pb-[8px] text-[12px] uppercase"
              style={{
                fontWeight: 680,
                letterSpacing: "0.07em",
                // `--surface` e' o token real da superficie de card. Antes aqui
                // estava `--card`, que NAO existe em lugar nenhum: o fundo caia
                // pra transparente e sobrava o `backdrop-filter` sozinho —
                // blur sem cor por tras, que le' como uma faixa clara atras do
                // texto (o mesmo defeito ja corrigido na lista de aulas).
                background: "var(--surface)",
                backdropFilter: "var(--blur-card)",
              }}
            >
              {nomeDoMes(chave)}
              <span
                className="text-text-muted text-[11.5px] normal-case tabular-nums"
                style={{ fontWeight: 550, letterSpacing: 0 }}
              >
                {doMes.length} {doMes.length === 1 ? "aula" : "aulas"} ·{" "}
                {comConteudo} com conteúdo
              </span>
            </h3>

            {doMes.map((aula) => (
              <LinhaDoMes
                key={aula.sessao_id}
                aula={aula}
                turmaId={turmaId}
                cor={aula.materia ? corPorMateria.get(aula.materia) : undefined}
              />
            ))}
          </section>
        );
      })}
    </div>
  );
}

/**
 * Uma aula na lista por mês (`.linha-mes`).
 *
 * Grade de 4 colunas: dia, texto, ponto da matéria e a porcentagem. O mês NÃO
 * se repete aqui — ele já está no cabeçalho do grupo, e repetir seria ruído.
 */
function LinhaDoMes({
  aula,
  turmaId,
  cor,
}: {
  aula: AulaCard;
  turmaId: number;
  cor?: string;
}) {
  const temDado = aula.engajamento_pct !== null;
  const [, , dia] = aula.data.split("-");

  const resumo =
    aula.conteudo_resumo ?? aula.resumo ?? "Nada foi anotado nesta aula";
  // O horário REAL da captura vem antes do resumo, como no protótipo
  // ("14:00 · Reconhecimento facial…").
  const hora = aula.hora_inicio ?? aula.hora_real_inicio;

  return (
    <Link
      href={`/relatorios/sessao/${aula.sessao_id}?turma=${turmaId}`}
      className="border-border-default hover:bg-surface-2 grid grid-cols-[34px_minmax(0,1fr)_auto_54px] items-center gap-[13px] rounded-[9px] border-b px-2 py-[10px] no-underline transition-colors last:border-b-0"
    >
      <span
        className="text-text-body text-right text-[17px] tabular-nums"
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 300,
          letterSpacing: "-0.02em",
        }}
      >
        {dia}
      </span>

      <span className="min-w-0">
        <span className="text-text block truncate text-[13.5px] leading-[1.3] font-semibold">
          {aula.titulo ?? "Aula sem registro"}
        </span>
        <span className="text-text-muted mt-[2px] block truncate text-[11.5px] leading-[1.35]">
          {hora} · {resumo}
        </span>
      </span>

      {/* A cor sozinha nunca carrega a informação: o `title` e o texto para
          leitor de tela levam o nome da matéria junto. */}
      <span
        className="h-2 w-2 flex-none rounded-full"
        style={{
          background: cor ? `var(--grafico-${cor})` : "var(--grafico-neutro)",
        }}
        title={aula.materia ?? "Sem matéria"}
        aria-hidden
      />
      <span className="sr-only">{aula.materia ?? "Sem matéria"}</span>

      <span
        className="text-right text-[14px] tabular-nums"
        style={{
          fontWeight: temDado ? 650 : 400,
          color: temDado ? "var(--text)" : "var(--text-muted)",
        }}
        title={
          temDado
            ? undefined
            : "Sem conteúdo registrado — o engajamento não foi medido"
        }
      >
        {temDado ? `${aula.engajamento_pct}%` : "—"}
      </span>
    </Link>
  );
}

function CartaoDaAula({
  aula,
  turmaId,
  cor,
  estilo,
}: {
  aula: AulaCard;
  turmaId: number;
  cor?: string;
  estilo: "4" | "5" | "7";
}) {
  const temDado = aula.engajamento_pct !== null;

  // Travessao, nunca 0%: "nao foi medido" e "ninguem prestou atencao" sao
  // afirmacoes diferentes, e so' uma delas e' verdade aqui.
  const valor = temDado ? `${aula.engajamento_pct}%` : "—";

  // O SELO leva a materia; o TITULO da aula e' outra coisa (o 1o topico
  // registrado). Antes o rodape mostrava "quarta, 12 de ago" no lugar do
  // titulo — ele apontou isso em 14/08.
  const materia = aula.materia ?? "Aula sem matéria";

  // Aula sem conteudo registrado NAO ganha titulo inventado: o proprio texto
  // diz que falta registro, como o "Aula sem registro" do prototipo.
  const titulo = aula.titulo ?? "Aula sem registro";

  // O resumo do CONTEUDO na frente da recomendacao: o card fala sobre o que
  // foi dado na aula, e a recomendacao e' o plano B quando nao ha conteudo.
  const resumo =
    aula.conteudo_resumo ?? aula.resumo ?? "Nada foi anotado nesta aula";

  const tamanhoDoNumero =
    estilo === "5"
      ? "clamp(34px, 5.6vw, 54px)"
      : estilo === "4"
        ? "44px"
        : "30px";

  const numero = (
    <span
      className="tabular-nums"
      title={
        temDado
          ? undefined
          : "Sem conteúdo registrado — o engajamento não foi medido"
      }
      style={{
        fontFamily: "var(--font-display)",
        fontSize: tamanhoDoNumero,
        lineHeight: 1,
        letterSpacing: "-0.04em",
        fontWeight: 300,
        color: temDado ? "var(--text)" : "var(--text-muted)",
      }}
    >
      {valor}
    </span>
  );

  // O rotulo DIZ qual e' o caso: "sem registro" no lugar de "engajamento"
  // quando nao houve medicao. Manter "engajamento" ao lado de um travessao
  // deixaria o professor achando que o engajamento foi medido e deu vazio.
  const rotuloMedida = (
    <span
      className="text-text-muted uppercase"
      style={{
        fontSize: estilo === "5" || estilo === "7" ? "9px" : "10.5px",
        letterSpacing: estilo === "7" ? "0.05em" : "0.04em",
        fontWeight: 600,
      }}
    >
      {temDado ? "engajamento" : "sem registro"}
    </span>
  );

  // Sem materia usa o par de AVISO, nao um cinza qualquer: "sem matéria" e'
  // uma pendencia da grade (a sessao nao ficou vinculada a nenhuma aula), e o
  // selo tem que ler como tal — e' o mesmo `.selo.aviso` do prototipo.
  const selo = (
    <span
      className="flex-none rounded-[999px] px-[7px] py-[2px]"
      style={{
        fontSize: "9.5px",
        fontWeight: 650,
        letterSpacing: "0.02em",
        background: cor ? `var(--materia-${cor}-bg)` : "var(--warn-bg)",
        color: cor ? `var(--materia-${cor}-fg)` : "var(--warn-fg)",
      }}
    >
      {materia}
    </span>
  );

  const data = (
    <span
      className="text-text-muted tabular-nums whitespace-nowrap uppercase"
      style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.03em" }}
    >
      {formatarDataCurta(aula.data)}
    </span>
  );

  const rodape = (
    <div className="min-w-0">
      <div
        className="text-text overflow-hidden text-[14px] leading-[1.3] font-semibold"
        style={{
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
        }}
      >
        {titulo}
      </div>
      {/* O resumo quebra em DUAS linhas em todos os estilos, e no 7 ainda
          reserva a altura das duas mesmo tendo uma so': cards da mesma
          fileira esticam ate o mais alto, e sem a reserva um resumo curto ao
          lado de um longo deixa degrau. */}
      <p
        className={`text-text-muted mt-[4px] overflow-hidden text-[11.5px] leading-[1.35] ${
          estilo === "7" ? "min-h-[2.7em]" : ""
        }`}
        style={{
          fontWeight: 400,
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
        }}
      >
        {resumo}
      </p>
    </div>
  );

  const comum =
    "border-border-default bg-surface relative flex flex-col rounded-[12px] border p-[15px] no-underline transition-[border-color] hover:border-[var(--border-strong)]";

  return (
    <Link
      href={`/relatorios/sessao/${aula.sessao_id}?turma=${turmaId}`}
      className={comum}
      style={{
        backdropFilter: "var(--blur-card)",
        boxShadow: "var(--shadow-card)",
        // O quadrado do 4 e do 5 vem de aspect-ratio; o 7 cresce com o texto.
        // 1/1 no computador — o 4/3 do prototipo so' vale abaixo de 620px,
        // onde a coluna fica estreita e o quadrado ficaria alto demais.
        ...(estilo === "5"
          ? {
              display: "grid",
              gridTemplateRows: "auto minmax(0, 1fr) auto",
              gap: "10px",
              aspectRatio: "var(--aspecto-card, 1 / 1)",
            }
          : estilo === "4"
            ? { aspectRatio: "var(--aspecto-card, 1 / 1)" }
            : {
                display: "grid",
                gridTemplateRows: "auto auto auto",
                gap: "9px",
              }),
      }}
    >
      {/* No 5 a materia fica a ESQUERDA e a data a DIREITA — dai o
          row-reverse com space-between (pedido dele em 11/08). */}
      <div
        className="flex items-center gap-2"
        style={
          estilo === "5"
            ? { flexDirection: "row-reverse", justifyContent: "space-between" }
            : { justifyContent: "space-between" }
        }
      >
        {selo}
        {data}
      </div>

      {estilo === "7" && rodape}

      {/* ⚠️ A faixa do meio e' `1fr` E o bloco leva `align-self: stretch`.
          Sem o stretch, o bloco fica do tamanho do conteudo e o
          `justify-content: center` centra DENTRO do bloco, nao na faixa —
          sobra vao mesmo com o 1fr certo. */}
      <div
        className="flex min-w-0"
        style={
          estilo === "5"
            ? {
                alignSelf: "stretch",
                flexDirection: "column",
                alignItems: "flex-start",
                justifyContent: "center",
                gap: "2px",
              }
            : estilo === "4"
              ? {
                  flex: 1,
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "2px",
                  minHeight: 0,
                }
              : {
                  flexDirection: "column",
                  alignItems: "flex-start",
                  gap: "6px",
                  paddingTop: "4px",
                  position: "relative",
                }
        }
      >
        {numero}
        {rotuloMedida}

        {/* Barra proporcional do v7. Aula SEM medicao nao ganha barra: uma
            barra a 0% seria a mesma mentira que o "0%" que evitamos acima. */}
        {estilo === "7" && temDado && (
          <span
            className="block h-[5px] w-full rounded-full"
            style={{ background: "var(--border)" }}
            aria-hidden
          >
            {/* `--grafico-*`, e nao `--materia-*-fg`: o par `-fg` e' cor de
                TEXTO (escura, pra contrastar com o grifo por baixo dela); a
                barra precisa contrastar com o FUNDO, e o token de grafico e'
                justamente esse — os valores batem com os `--mat-*-grafico` do
                prototipo. No claro a diferenca e' grande (#3573e3 contra
                #1a3d7d no azul), e era ela que deixava a barra escura demais. */}
            <span
              className="block h-full rounded-full"
              style={{
                width: `${aula.engajamento_pct}%`,
                background: cor
                  ? `var(--grafico-${cor})`
                  : "var(--grafico-neutro)",
              }}
            />
          </span>
        )}
      </div>

      {estilo !== "7" && rodape}
    </Link>
  );
}
