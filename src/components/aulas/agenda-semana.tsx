"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, type CSSProperties } from "react";

import { EditorAula } from "@/components/aulas/editor-aula";
import { IconClipe, IconLapis, IconLousa } from "@/components/ui/icons";
import type { Aula, DiaDaSemana } from "@/lib/types";

/**
 * Dias UTEIS, na ordem em que a grade e' desenhada.
 *
 * A API devolve os 7, mas sabado e domingo so' aparecem se tiverem aula: numa
 * escola normal eles ficariam vazios pra sempre, roubando 2/7 da largura da
 * grade pra dizer "sem aula" duas vezes.
 */
const DIAS_UTEIS = [1, 2, 3, 4, 5];

/** "segunda" -> "Seg". A API manda o nome inteiro, sem acento. */
const ABREVIACAO: Record<number, string> = {
  0: "Dom",
  1: "Seg",
  2: "Ter",
  3: "Qua",
  4: "Qui",
  5: "Sex",
  6: "Sáb",
};

const NOMES_MES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

/**
 * As datas reais da semana corrente, indexadas por dia da semana (0=dom).
 *
 * A grade do banco guarda o DIA DA SEMANA (0-6), nunca uma data — ela e' um
 * horario que se repete. Mas o prototipo mostra "SEG 10", com o numero do dia,
 * entao a data e' calculada aqui a partir de hoje: e' informacao derivada, nao
 * um campo que a API precise passar a ter.
 */
function datasDaSemana(hoje: Date) {
  const domingo = new Date(hoje);
  domingo.setDate(hoje.getDate() - hoje.getDay());

  const porDiaSemana = new Map<number, Date>();
  for (let i = 0; i < 7; i++) {
    const d = new Date(domingo);
    d.setDate(domingo.getDate() + i);
    porDiaSemana.set(i, d);
  }
  return porDiaSemana;
}

/**
 * A grade do mes inteiro, como o prototipo monta: cada aula se repete no seu
 * dia da semana ao longo do mes.
 *
 * Isso e' fiel ao dado, nao invencao: a tabela `aulas` guarda dia da semana +
 * horario, ou seja, a aula de segunda acontece TODA segunda. O mes e' so' a
 * mesma grade projetada num calendario.
 *
 * As casas do mes anterior e do proximo entram pra grade fechar em linhas de 7
 * — elas nunca recebem aula (`diaSemana: null`).
 */
function celulasDoMesDe(hoje: Date) {
  const ano = hoje.getFullYear();
  const mes = hoje.getMonth();

  const diasNoMes = new Date(ano, mes + 1, 0).getDate();
  const comecaEm = new Date(ano, mes, 1).getDay();
  const diasMesAnterior = new Date(ano, mes, 0).getDate();

  type Celula = {
    chave: string;
    numero: number;
    diaSemana: number | null;
    hoje: boolean;
    foraDoMes: boolean;
  };
  const celulas: Celula[] = [];

  for (let i = comecaEm - 1; i >= 0; i--) {
    const numero = diasMesAnterior - i;
    celulas.push({
      chave: `antes-${numero}`,
      numero,
      diaSemana: null,
      hoje: false,
      foraDoMes: true,
    });
  }

  for (let d = 1; d <= diasNoMes; d++) {
    celulas.push({
      chave: `dia-${d}`,
      numero: d,
      diaSemana: new Date(ano, mes, d).getDay(),
      hoje: d === hoje.getDate(),
      foraDoMes: false,
    });
  }

  let proximo = 1;
  while (celulas.length % 7 !== 0) {
    celulas.push({
      chave: `depois-${proximo}`,
      numero: proximo,
      diaSemana: null,
      hoje: false,
      foraDoMes: true,
    });
    proximo++;
  }

  return celulas;
}

/** "10 a 14 de agosto" — o periodo no cabecalho, como no prototipo. */
function rotuloDoPeriodo(datas: Map<number, Date>, dias: number[]) {
  const doPrimeiro = datas.get(dias[0]);
  const doUltimo = datas.get(dias[dias.length - 1]);
  if (!doPrimeiro || !doUltimo) return "";

  const mesInicio = NOMES_MES[doPrimeiro.getMonth()];
  const mesFim = NOMES_MES[doUltimo.getMonth()];

  // Semana que cruza o virar do mes precisa nomear os dois.
  return mesInicio === mesFim
    ? `${doPrimeiro.getDate()} a ${doUltimo.getDate()} de ${mesFim}`
    : `${doPrimeiro.getDate()} de ${mesInicio} a ${doUltimo.getDate()} de ${mesFim}`;
}

/**
 * A coluna de um dia (.agenda-dia do prototipo).
 *
 * `backdropFilter: none` no style, e nao pela classe `backdrop-blur-none`: o
 * Tailwind v4 nao emite regra pra ela (so' define a variavel --tw-backdrop-*),
 * entao a classe perde pro seletor global `:where([class*="bg-surface"])`. O
 * style e' o unico lugar que vence sempre.
 *
 * O dia NAO leva blur porque ja' esta dentro de um card embacado — embacar de
 * novo so' empilha custo de composicao sem mudar o que se ve.
 *
 * A borda e' branca a 7%, nao `--border`: aqui ela e' o brilho da quina de um
 * bloco DENTRO do vidro, mais fraca que a borda do card que o contem.
 */
const ESTILO_DO_DIA = {
  backdropFilter: "none",
  borderColor: "rgba(255, 255, 255, 0.07)",
} as const;

/**
 * Classe de cor da materia. Cai em "cinza" quando a aula nao tem materia — o
 * bloco continua visivel, so' sem identidade de cor.
 */
function corDaAula(aula: Aula) {
  return aula.materia_cor ?? "cinza";
}

function BlocoDaAula({
  aula,
  mostrarTurma,
  aoEditar,
  compacto = false,
}: {
  aula: Aula;
  mostrarTurma: boolean;
  aoEditar: (aula: Aula) => void;
  /** Modo mes: a celula tem ~1/7 da largura e nao cabe plano nem anexo. */
  compacto?: boolean;
}) {
  const cor = corDaAula(aula);

  // No mes o bloco vira uma tira: materia + horario, sem o rodape de
  // preparacao. Espremer plano e anexo numa celula de 7 colunas nao os
  // tornaria legiveis — so' faria o calendario virar uma parede de texto.
  if (compacto) {
    return (
      <button
        type="button"
        onClick={() => aoEditar(aula)}
        title={`${aula.materia_nome ?? "Sem matéria"} · ${aula.hora_inicio} – ${aula.hora_fim}`}
        className="w-full cursor-pointer truncate rounded-[6px] px-[6px] py-[3px] text-left text-[10px] font-semibold transition-[filter] duration-150 hover:brightness-[0.975]"
        style={{
          background: `var(--materia-${cor}-bg)`,
          color: `var(--materia-${cor}-fg)`,
        }}
      >
        {aula.hora_inicio} {aula.materia_nome ?? "Sem matéria"}
      </button>
    );
  }

  return (
    // Medidas do prototipo (.bloco-aula): padding 9px 10px 10px, raio 10px,
    // fundo pastel SOLIDO sem borda e sem sombra — estilo da referencia
    // "Inside Calendar". O escurecimento no hover e' filter, nao troca de cor:
    // vale pras 8 cores de materia sem precisar de uma variante por cor.
    <div
      className="group/bloco relative cursor-pointer rounded-[10px] px-[10px] pt-[9px] pb-[10px] text-left transition-[filter] duration-150 hover:brightness-[0.975]"
      style={{
        background: `var(--materia-${cor}-bg)`,
        color: `var(--materia-${cor}-fg)`,
      }}
    >
      {/* Canto superior direito, com veu proprio pra se destacar do pastel.
          So' aparece no hover pra nao poluir cinco blocos empilhados — mas
          volta no foco de teclado e fica SEMPRE visivel onde nao ha hover
          (toque), senao seria inalcancavel no celular. */}
      <button
        type="button"
        onClick={() => aoEditar(aula)}
        className="absolute top-1.5 right-1.5 grid h-5 w-5 place-items-center rounded-md opacity-0 transition-opacity duration-150 group-hover/bloco:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100"
        style={{ background: "var(--veu-bloco)", color: "inherit" }}
        aria-label={`Editar plano e material de ${aula.materia_nome ?? "aula sem matéria"}, ${aula.dia_semana_nome} ${aula.hora_inicio}`}
      >
        <IconLapis size={12} />
      </button>

      {/* Materia em cima, horario embaixo (nao lado a lado): com
          "07:00 – 07:45" a linha nao cabe numa coluna de ~230px, e quem
          espremia era o nome da materia. pr-5 abre espaco pro lapis. */}
      <div className="flex flex-col gap-px pr-5 text-[12px] font-semibold tracking-[-0.01em]">
        <span>{aula.materia_nome ?? "Sem matéria"}</span>
        <span className="text-[11.5px] tabular-nums">
          {aula.hora_inicio} – {aula.hora_fim}
        </span>
      </div>

      {mostrarTurma && (
        <span className="mt-px block text-[11.5px] font-medium">
          {aula.turma_nome}
        </span>
      )}

      {/* Plano e anexo, separados por um filete. Ausencia e' DECLARADA
          ("Sem plano"), nao omitida — o vazio aqui e' informacao, e some-lo
          faria a aula sem preparo parecer igual a uma preparada.

          O filete e' currentColor a 22%: puro seria forte demais, e uma cor
          fixa nao acompanharia as 8 cores de materia. */}
      <div
        className="mt-[7px] flex flex-col gap-[5px] pt-[7px]"
        style={{
          borderTop:
            "1px solid color-mix(in srgb, currentColor 22%, transparent)",
        }}
      >
        <LinhaDoBloco
          icone={<IconLousa size={12} />}
          texto={aula.plano}
          vazio="Sem plano"
        />
        <LinhaDoBloco
          icone={<IconClipe size={12} />}
          texto={aula.anexo_nome}
          vazio="Sem anexo"
        />
      </div>
    </div>
  );
}

/**
 * Uma linha de preparacao (plano ou anexo) dentro do bloco.
 *
 * `items-start` e o `mt-[1.5px]` no icone: com texto de duas ou tres linhas,
 * centralizar joga o icone pro meio do paragrafo e ele vira um ponto solto.
 * Ele tem que ancorar na PRIMEIRA linha.
 */
function LinhaDoBloco({
  icone,
  texto,
  vazio,
}: {
  icone: React.ReactNode;
  texto: string | null;
  vazio: string;
}) {
  const preenchido = Boolean(texto);
  return (
    <span
      className={`flex items-start gap-[5px] text-[11.5px] leading-[1.4] ${
        preenchido ? "" : "italic opacity-[0.62]"
      }`}
      // 550 e' o peso do prototipo. A Montserrat carregada tem 500 e 600
      // estaticos, entao 550 cai no mais proximo — o valor fica registrado
      // aqui pra bater com o desenho se um dia a fonte virar variavel.
      style={{ fontWeight: preenchido ? 550 : 500 }}
    >
      <span className="mt-[1.5px] flex-none opacity-80">{icone}</span>
      <span className="min-w-0 break-words">{texto || vazio}</span>
    </span>
  );
}

type Props = {
  semana: DiaDaSemana[];
  /** Nome da turma quando a agenda e' de uma turma so'; ausente = todas. */
  nomeDaTurma?: string;
};

/**
 * A grade da semana do professor — o bloco "Sua semana" da tela Minhas Aulas.
 *
 * A API devolve SEMPRE os 7 dias (dia vazio vem com lista vazia): um dia que
 * some faria a grade encolher e as colunas desalinharem entre semanas.
 *
 * Nao ha data de calendario nos blocos, so' o dia da semana — a tabela `aulas`
 * e' uma GRADE que se repete, e ela guarda o dia (0-6), nunca uma data.
 */
export function AgendaSemana({ semana, nomeDaTurma }: Props) {
  const router = useRouter();
  const [emEdicao, setEmEdicao] = useState<Aula | null>(null);
  const [modo, setModo] = useState<"semana" | "mes">("semana");

  const porDia = new Map(semana.map((dia) => [dia.dia_semana, dia]));

  // Fim de semana entra na grade so' quando ha aula nele.
  const diasComAula = semana
    .filter((dia) => dia.aulas.length > 0)
    .map((dia) => dia.dia_semana);
  const dias = [...new Set([...DIAS_UTEIS, ...diasComAula])].sort(
    (a, b) => a - b,
  );

  // A contagem "N aulas por semana" saiu do cabecalho em 14/08: o prototipo
  // mostra ali o PERIODO ("10 a 14 de agosto"), que e' o que situa o professor
  // na grade. O total continua visivel — e' so' contar os blocos.

  // `useMemo` sem dependencia: `new Date()` a cada render faria as datas da
  // grade mudarem no meio de uma interacao (ex.: virar a meia-noite com a tela
  // aberta reordenaria tudo debaixo do dedo do professor).
  const hoje = useMemo(() => new Date(), []);
  const datas = useMemo(() => datasDaSemana(hoje), [hoje]);
  const periodo = rotuloDoPeriodo(datas, dias);
  const celulasDoMes = useMemo(() => celulasDoMesDe(hoje), [hoje]);

  return (
    <section
      className="bg-surface border-border-default overflow-hidden rounded-[12px] border"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      {/* .card-topo do prototipo: padding 15px 17px 11px, gap 10px, h2 de
          16px e a contagem em 12.5px apagada. */}
      <div className="flex flex-wrap items-center gap-[10px] px-[17px] pt-[15px] pb-[11px]">
        {/* letterSpacing no style inline, nao em `tracking-[-0.16px]`: o valor
            arbitrario do Tailwind resolve sobre outro tamanho base e sai
            -0.24px. Cravar o px final e' o unico jeito de bater com o
            prototipo. */}
        <h2
          className="text-text text-[16px] font-semibold"
          style={{ letterSpacing: "-0.16px" }}
        >
          {nomeDaTurma
            ? `Aulas da ${nomeDaTurma} ${modo === "mes" ? "no mês" : "na semana"}`
            : modo === "mes"
              ? "Seu mês"
              : "Sua semana"}
        </h2>
        <span
          className="text-text-muted text-[12.5px] tabular-nums"
          style={{ fontWeight: 400 }}
        >
          {modo === "mes"
            ? `${NOMES_MES[hoje.getMonth()]} de ${hoje.getFullYear()}`
            : periodo}
        </span>

        {/* `.filtro-mes` do prototipo: pastilha redonda de 999px, 5px 11px,
            11.5px/550. Alterna a MESMA grade entre semana e mes — a aula da
            segunda acontece toda segunda, entao o mes se monta repetindo cada
            aula no seu dia da semana. */}
        <button
          type="button"
          onClick={() => setModo((m) => (m === "semana" ? "mes" : "semana"))}
          aria-label={
            modo === "semana"
              ? "Ver o mês inteiro"
              : "Ver só a semana"
          }
          className="border-border-default bg-surface-2 text-text-body hover:text-text ml-auto flex-none cursor-pointer rounded-full border px-[11px] py-[5px] text-[11.5px] transition-colors"
          style={{ fontWeight: 550 }}
        >
          {modo === "semana" ? "Semana ▾" : "Mês ▾"}
        </button>
      </div>

      {/* Uma coluna no celular, a semana lado a lado a partir de `md`.
          Cinco colunas em 360px dao ~60px cada: medido em 13/08, o texto
          quebrava em toda palavra e "Sem matéria" saia cortado. A semana so'
          se le' em paralelo quando ha largura pra isso.

          `--colunas` sai daqui porque o numero de dias e' dinamico (fim de
          semana entra so' quando tem aula) — nao da pra escrever a classe
          `grid-cols-N` do Tailwind com um valor que so' existe em execucao. */}
      {/* `items-start`: cada coluna tem a altura do PROPRIO conteudo. Sem
          isso a segunda-feira (5 aulas) esticaria as outras quatro junto, e
          "Qua — sem aula" viraria um bloco vazio de 600px. */}
      {modo === "mes" && (
        <>
          {/* Cabeca de dias da semana, so' no modo mes — numa grade de 7
              colunas o professor precisa saber qual coluna e' qual. */}
          <div className="text-text-muted hidden grid-cols-7 gap-[9px] px-[17px] pb-[6px] text-[10px] font-semibold tracking-[0.08em] uppercase md:grid">
            {[0, 1, 2, 3, 4, 5, 6].map((d) => (
              <span key={d}>{ABREVIACAO[d]}</span>
            ))}
          </div>

          <div className="grid grid-cols-1 items-start gap-[9px] px-[17px] pt-0.5 pb-[17px] md:grid-cols-7">
            {celulasDoMes.map((celula) => {
              const aulasDoDia = celula.diaSemana === null
                ? []
                : (porDia.get(celula.diaSemana)?.aulas ?? []);

              // Dia de fora do mes existe so' pra grade fechar na coluna
              // certa: ele nao recebe aula nem no prototipo.
              const vazio = celula.foraDoMes || aulasDoDia.length === 0;

              return (
                <div
                  key={celula.chave}
                  className={`bg-surface-2 flex min-h-[86px] flex-col gap-[5px] rounded-[9px] border px-[9px] pt-[8px] pb-[10px] max-md:hidden ${
                    celula.foraDoMes ? "opacity-40" : ""
                  }`}
                  style={
                    celula.hoje
                      ? { ...ESTILO_DO_DIA, borderColor: "var(--primary)" }
                      : ESTILO_DO_DIA
                  }
                >
                  <span
                    className={`text-[11px] tabular-nums ${
                      celula.hoje
                        ? "text-text-brand font-bold"
                        : "text-text-muted font-semibold"
                    }`}
                  >
                    {celula.numero}
                  </span>

                  {!vazio &&
                    aulasDoDia.map((aula) => (
                      <BlocoDaAula
                        key={`${celula.chave}-${aula.id}`}
                        aula={aula}
                        mostrarTurma={!nomeDaTurma}
                        aoEditar={setEmEdicao}
                        compacto
                      />
                    ))}
                </div>
              );
            })}
          </div>
        </>
      )}

      <div
        className={`grid-cols-1 items-start gap-[9px] px-[17px] pt-0.5 pb-[17px] md:[grid-template-columns:repeat(var(--colunas),minmax(0,1fr))] ${
          modo === "mes" ? "grid md:hidden" : "grid"
        }`}
        style={{ "--colunas": dias.length } as CSSProperties}
      >
        {dias.map((numero) => {
          const dia = porDia.get(numero);
          const aulas = dia?.aulas ?? [];

          // No celular, dia vazio nao ocupa uma faixa inteira dizendo "Sem
          // aula" — ele simplesmente sai. No computador ele FICA, senao a
          // grade encolhe e as colunas desalinham entre semanas.
          if (aulas.length === 0) {
            return (
              <div
                key={numero}
                className="bg-surface-2 hidden min-h-[110px] flex-col gap-1.5 rounded-[9px] border px-[11px] pt-[11px] pb-[13px] md:flex"
                style={ESTILO_DO_DIA}
              >
                <span className="text-text-muted mb-[9px] flex items-baseline gap-[5px] text-[10px] font-semibold tracking-[0.08em] uppercase">
                  {ABREVIACAO[numero]}
                  <span className="text-[11px] tabular-nums opacity-70">
                    {datas.get(numero)?.getDate()}
                  </span>
                </span>
                <span className="text-text-muted text-[11px] italic opacity-70">
                  Sem aula
                </span>
              </div>
            );
          }

          return (
            <div
              key={numero}
              className="bg-surface-2 flex min-h-[110px] flex-col gap-[6px] rounded-[9px] border px-[11px] pt-[11px] pb-[13px]"
              style={ESTILO_DO_DIA}
            >
              {/* Nome + DATA, como o `.agenda-cabeca` do prototipo ("SEG 10").
                  A data e' calculada da semana corrente: a grade do banco so'
                  guarda o dia da semana. */}
              <span className="text-text-muted mb-[3px] flex items-baseline gap-[5px] text-[10px] font-semibold tracking-[0.08em] uppercase">
                {ABREVIACAO[numero]}
                <span className="text-[11px] tabular-nums opacity-70">
                  {datas.get(numero)?.getDate()}
                </span>
              </span>

              {aulas.map((aula) => (
                <BlocoDaAula
                  key={aula.id}
                  aula={aula}
                  mostrarTurma={!nomeDaTurma}
                  aoEditar={setEmEdicao}
                />
              ))}
            </div>
          );
        })}
      </div>

      {/* router.refresh() e nao um setState local: o plano e o anexo sao
          renderizados pelo SERVIDOR (a pagina e' server component), entao
          quem tem que reler e' ele. Mexer so' no estado daqui deixaria a
          tela mostrando um valor que o banco talvez nao tenha aceitado. */}
      <EditorAula
        aula={emEdicao}
        aoFechar={() => setEmEdicao(null)}
        aoSalvar={() => {
          setEmEdicao(null);
          router.refresh();
        }}
      />
    </section>
  );
}
