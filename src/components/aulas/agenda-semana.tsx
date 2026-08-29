"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, type CSSProperties } from "react";

import Link from "next/link";

import { EditorAula } from "@/components/aulas/editor-aula";
import { EventosDoDia } from "@/components/aulas/eventos-do-dia";
import { FormularioEvento } from "@/components/aulas/formulario-evento";
import { ModalNovaAula } from "@/components/aulas/modal-nova-aula";
import {
  IconClipe,
  IconLapis,
  IconLousa,
  IconMais,
  IconSetaDireita,
} from "@/components/ui/icons";
import type {
  Aula,
  Turma,
  DiaDaSemana,
  EventoDaAgenda,
  Materia,
  NovaAula,
  NovoEventoDaAgenda,
} from "@/lib/types";
import { deduzirTurno, TURNO_PADRAO } from "@/lib/turnos";

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

/** "AAAA-MM-DD" no fuso LOCAL.
 *
 * `toISOString()` converte pra UTC antes de formatar: no Brasil (UTC-3) isso
 * joga qualquer hora antes das 03:00 pro dia ANTERIOR, e a semana inteira
 * deslizaria um dia. Montar a string a partir dos getters locais evita isso.
 */
function comoISO(data: Date) {
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${data.getFullYear()}-${mes}-${dia}`;
}

/** A mesma data com `dias` somados (ou subtraidos, se negativo). */
function somarDias(data: Date, dias: number) {
  const nova = new Date(data);
  nova.setDate(data.getDate() + dias);
  return nova;
}

/** Nome por extenso, so' pro aria-label do botao de adicionar. */
const NOME_DO_DIA: Record<number, string> = {
  0: "domingo",
  1: "segunda-feira",
  2: "terça-feira",
  3: "quarta-feira",
  4: "quinta-feira",
  5: "sexta-feira",
  6: "sábado",
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
function datasDaSemana(referencia: Date) {
  const domingo = new Date(referencia);
  domingo.setDate(referencia.getDate() - referencia.getDay());

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
function celulasDoMesDe(referencia: Date, hoje: Date) {
  const ano = referencia.getFullYear();
  const mes = referencia.getMonth();

  const diasNoMes = new Date(ano, mes + 1, 0).getDate();
  const comecaEm = new Date(ano, mes, 1).getDay();
  const diasMesAnterior = new Date(ano, mes, 0).getDate();

  const hojeISO = comoISO(hoje);

  type Celula = {
    chave: string;
    numero: number;
    diaSemana: number | null;
    /** "AAAA-MM-DD" do dia, ou null nos dias de fora do mes. */
    data: string | null;
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
      data: null,
      hoje: false,
      foraDoMes: true,
    });
  }

  for (let d = 1; d <= diasNoMes; d++) {
    const data = comoISO(new Date(ano, mes, d));
    celulas.push({
      chave: `dia-${d}`,
      numero: d,
      diaSemana: new Date(ano, mes, d).getDay(),
      data,
      // Compara a DATA inteira, nao so' o numero do dia: navegando pra outro
      // mes, `d === hoje.getDate()` marcaria o dia 25 de qualquer mes como
      // hoje.
      hoje: data === hojeISO,
      foraDoMes: false,
    });
  }

  let proximo = 1;
  while (celulas.length % 7 !== 0) {
    celulas.push({
      chave: `depois-${proximo}`,
      numero: proximo,
      diaSemana: null,
      data: null,
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
  cancelada = false,
}: {
  aula: Aula;
  mostrarTurma: boolean;
  aoEditar: (aula: Aula) => void;
  /** Modo mes: a celula tem ~1/7 da largura e nao cabe plano nem anexo. */
  compacto?: boolean;
  /**
   * A aula esta na grade mas NAO acontece nesta data (feriado, reuniao).
   *
   * Risca o bloco em vez de esconde-lo: sumir faria o professor achar que
   * errou o dia, ou que a aula sumiu do sistema. O motivo aparece ao lado,
   * no evento 'cancelada' que gerou isto.
   */
  cancelada?: boolean;
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
        title={
          cancelada
            ? `${aula.materia_nome ?? "Sem matéria"} · ${aula.hora_inicio} – ${aula.hora_fim} · não acontece neste dia`
            : `${aula.materia_nome ?? "Sem matéria"} · ${aula.hora_inicio} – ${aula.hora_fim}`
        }
        className={`w-full cursor-pointer truncate rounded-[6px] px-[6px] py-[3px] text-left text-[10px] font-semibold transition-[filter] duration-150 hover:brightness-[0.975] ${
          cancelada ? "line-through opacity-55" : ""
        }`}
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
      className={`group/bloco relative cursor-pointer rounded-[10px] px-[10px] pt-[9px] pb-[10px] text-left transition-[filter] duration-150 hover:brightness-[0.975] ${
        cancelada ? "opacity-60" : ""
      }`}
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
        <span className={cancelada ? "line-through" : ""}>
          {aula.materia_nome ?? "Sem matéria"}
        </span>
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
  /**
   * Turma da agenda. Ausente = agenda consolidada (todas as turmas).
   *
   * ATE 29/08/2026 o botao "adicionar aula" so' aparecia com este id, porque
   * na visao consolidada nao havia resposta pra "em qual turma?". Agora ha': o
   * modal pergunta (ver ModalNovaAula). O dropdown vive DENTRO do modal, e nao
   * no rodape da coluna, entao ele nao compete com o seletor do topo da tela.
   */
  turmaId?: number;
  /** Materias pro dropdown do formulario. */
  materias?: Materia[];
  /**
   * Turmas do professor, pros seletores dos modais.
   *
   * So' usada na agenda CONSOLIDADA (sem `turmaId`): la' o modal de aula nova e
   * o de evento precisam perguntar a turma, porque nao ha' uma no topo da tela
   * pra herdar.
   */
  turmas?: Turma[];
  /**
   * Eventos COM DATA do periodo em exibicao (GET /agenda).
   *
   * Sao eles que fazem esta semana ser diferente da proxima: a grade sozinha
   * (`semana`) se repete identica pra sempre, porque a tabela `aulas` guarda
   * dia da semana, nunca data.
   */
  eventos?: EventoDaAgenda[];
  /**
   * Qualquer dia da semana a exibir, "AAAA-MM-DD". Ausente = a semana de hoje.
   *
   * Vem da pagina (que le' da barra de endereco) e nao de estado local: assim
   * a semana fica no endereco, o professor pode salvar o link, e o botao
   * voltar do navegador funciona como esperado — mesma decisao do SeletorTurma.
   */
  data?: string;
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
export function AgendaSemana({
  semana,
  nomeDaTurma,
  turmaId,
  materias = [],
  turmas = [],
  eventos = [],
  data,
}: Props) {
  const router = useRouter();
  const [emEdicao, setEmEdicao] = useState<Aula | null>(null);
  const [modo, setModo] = useState<"semana" | "mes">("semana");

  /** Dia cujo formulario de aula nova esta aberto. Um por vez. */
  const [criandoNoDia, setCriandoNoDia] = useState<number | null>(null);

  /**
   * O formulario de EVENTO aberto, se houver.
   *
   * Guarda a data (a coluna onde abriu) e o evento em edicao — ausente quando
   * esta criando. Um por vez, como o de aula: dois formularios abertos na
   * mesma grade competiriam pelo foco.
   */
  const [eventoAberto, setEventoAberto] = useState<
    { data: string; evento: EventoDaAgenda | null } | null
  >(null);

  // A agenda consolidada nao sabe em qual turma criar (ver `turmaId` nas
  // Props). Sem id, o rodape nao aparece.
  // Da' pra criar aula quando ha' uma turma na tela, ou quando ha' turmas pra
  // escolher no modal. So' fica escondido quando nao existe turma nenhuma.
  const podeAdicionar = turmaId !== undefined || turmas.length > 0;

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

  // A semana EXIBIDA, que nem sempre e' a de hoje.
  //
  // A data chega como "AAAA-MM-DD" e e' lida com `new Date(ano, mes, dia)`, nao
  // com `new Date(texto)`: a segunda forma interpreta a string como UTC e, no
  // Brasil, devolveria o dia anterior.
  const referencia = useMemo(() => {
    if (!data) return hoje;
    const [ano, mes, dia] = data.split("-").map(Number);
    if (!ano || !mes || !dia) return hoje;
    return new Date(ano, mes - 1, dia);
  }, [data, hoje]);

  const datas = useMemo(() => datasDaSemana(referencia), [referencia]);
  const periodo = rotuloDoPeriodo(datas, dias);
  const celulasDoMes = useMemo(
    () => celulasDoMesDe(referencia, hoje),
    [referencia, hoje],
  );

  // Enderecos das setas. O domingo da semana exibida e' a ancora: somar 7 dias
  // a ele cai sempre no domingo seguinte, sem depender de qual dia da semana o
  // professor escolheu.
  const domingoExibido = datas.get(0) ?? referencia;
  const semanaAnterior = comoISO(somarDias(domingoExibido, -7));
  const semanaSeguinte = comoISO(somarDias(domingoExibido, 7));

  // A semana de hoje ja' esta na tela? Entao o botao "hoje" nao tem pra onde
  // levar — some, em vez de virar um clique que nao faz nada.
  const domingoDeHoje = comoISO(somarDias(hoje, -hoje.getDay()));
  const naSemanaDeHoje = comoISO(domingoExibido) === domingoDeHoje;

  const base = turmaId !== undefined ? `/aulas/${turmaId}` : "/aulas";

  // Eventos indexados por data, pra cada coluna pegar os seus com um `get`.
  const eventosPorData = useMemo(() => {
    const mapa = new Map<string, EventoDaAgenda[]>();
    for (const evento of eventos) {
      const lista = mapa.get(evento.data);
      if (lista) lista.push(evento);
      else mapa.set(evento.data, [evento]);
    }
    return mapa;
  }, [eventos]);

  // (aula_id, data) das aulas riscadas por um evento 'cancelada'.
  //
  // Conjunto de chaves compostas, e nao uma busca na lista a cada bloco: a
  // pergunta "esta aula acontece neste dia?" e' feita uma vez por aula por dia.
  const canceladas = useMemo(() => {
    const chaves = new Set<string>();
    for (const evento of eventos) {
      if (evento.tipo === "cancelada" && evento.aula_id !== null) {
        chaves.add(`${evento.aula_id}|${evento.data}`);
      }
    }
    return chaves;
  }, [eventos]);

  // O turno so' alimenta o exemplo que o Tab preenche no formulario. Deduzido
  // das aulas que ja existem: numa escola da tarde, sugerir "07:00" seria um
  // exemplo que o professor tem que apagar toda vez.
  const turno = useMemo(() => {
    const horas = semana.flatMap((dia) => dia.aulas.map((a) => a.hora_inicio));
    return deduzirTurno(horas) ?? TURNO_PADRAO;
  }, [semana]);

  /**
   * Aulas da grade que caem numa data "AAAA-MM-DD".
   *
   * O modal de evento precisa delas pro seletor de 'cancelada' — ele tem que
   * saber o que ha' pra riscar naquele dia. A grade guarda DIA DA SEMANA, entao
   * o caminho e' data -> dia da semana -> aulas.
   */
  function aulasDoDiaDaData(dataISO: string) {
    const [ano, mes, dia] = dataISO.split("-").map(Number);
    if (!ano || !mes || !dia) return [];
    // Meio-dia pelo mesmo motivo do FormularioEvento: na hora zero um
    // deslocamento de fuso cairia no dia anterior.
    const diaSemana = new Date(ano, mes - 1, dia, 12).getDay();
    return porDia.get(diaSemana)?.aulas ?? [];
  }

  async function criarAulaNoDia(
    turmaDaAula: number,
    diaSemana: number,
    dados: NovaAula,
  ) {
    const resposta = await fetch(`/api/admin/turmas/${turmaDaAula}/aulas`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...dados, dia_semana: diaSemana }),
    });

    if (!resposta.ok) {
      // A ponte ja' traduziu o status (409 de conflito de horario vira uma
      // frase). Lancar Error faz o formulario mostrar o texto e ficar aberto,
      // com o que o professor digitou preservado.
      const corpo = await resposta.json().catch(() => null);
      throw new Error(corpo?.erro ?? "Não foi possível criar a aula.");
    }

    setCriandoNoDia(null);
    // Server component: quem redesenha a grade e' o servidor (ver a nota do
    // EditorAula no fim deste arquivo).
    router.refresh();
  }

  /** Salva (cria ou edita) o evento aberto e redesenha a grade. */
  async function salvarEvento(dados: NovoEventoDaAgenda) {
    const editando = eventoAberto?.evento;
    const destino = editando
      ? `/api/agenda/eventos/${editando.id}`
      : "/api/agenda/eventos";

    const resposta = await fetch(destino, {
      method: editando ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dados),
    });

    if (!resposta.ok) {
      // A ponte ja' traduziu o status. Lancar Error faz o formulario mostrar o
      // texto e ficar aberto, com o que o professor digitou preservado.
      const corpo = await resposta.json().catch(() => null);
      throw new Error(corpo?.erro ?? "Não foi possível salvar o evento.");
    }

    setEventoAberto(null);
    router.refresh();
  }

  async function apagarEvento(eventoId: number) {
    const resposta = await fetch(`/api/agenda/eventos/${eventoId}`, {
      method: "DELETE",
    });
    if (!resposta.ok) {
      const corpo = await resposta.json().catch(() => null);
      throw new Error(corpo?.erro ?? "Não foi possível apagar o evento.");
    }
    setEventoAberto(null);
    router.refresh();
  }

  /** Abre o modal vazio pro dia da coluna. */
  function BotaoNovoEvento({ data: dataDaColuna }: { data: string }) {
    return (
      <button
        type="button"
        onClick={() => setEventoAberto({ data: dataDaColuna, evento: null })}
        aria-label={`Adicionar evento em ${dataDaColuna}`}
        className="text-text-muted hover:text-text-brand flex items-center justify-center gap-[4px] rounded-[7px] py-[4px] text-[10.5px] transition-colors"
        style={{ fontWeight: 550 }}
      >
        <IconMais size={11} />
        Evento
      </button>
    );
  }

  /**
   * Rodape da coluna do dia: o botao de adicionar, ou o formulario aberto.
   *
   * Fica no fim da coluna, depois das aulas, porque e' onde o dia "continua" —
   * o professor le' de cima pra baixo e o proximo horario vem embaixo do
   * ultimo.
   */
  function RodapeDoDia({ numero }: { numero: number }) {
    if (!podeAdicionar) return null;

    return (
      <button
        type="button"
        onClick={() => setCriandoNoDia(numero)}
        // `mt-auto` empurra pro fim: em colunas de alturas diferentes os
        // botoes ficam alinhados na base, em vez de flutuar logo abaixo da
        // ultima aula de cada dia.
        className="text-text-muted hover:text-text-brand mt-auto flex items-center justify-center gap-[5px] rounded-[7px] border border-dashed py-[7px] text-[11px] font-semibold transition-colors"
        style={{ borderColor: "var(--border)" }}
        aria-label={`Adicionar aula na ${NOME_DO_DIA[numero]}`}
      >
        <IconMais size={12} />
        Adicionar aula
      </button>
    );
  }

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
          {/* `referencia`, e nao `hoje`: navegando pra dezembro o rotulo tem
              que dizer dezembro. */}
          {modo === "mes"
            ? `${NOMES_MES[referencia.getMonth()]} de ${referencia.getFullYear()}`
            : periodo}
        </span>

        {/* As setas de semana.

            <Link> e nao botao com estado: a semana vive no ENDERECO (?data=),
            entao o link certo ja' e' navegavel, salvavel e funciona com o
            botao voltar do navegador. Um setState local perderia tudo isso.

            Elas so' aparecem no modo semana — no mes, "semana anterior" nao
            tem significado. */}
        {modo === "semana" && (
          <div className="ml-auto flex flex-none items-center gap-[6px]">
            {!naSemanaDeHoje && (
              <Link
                href={base}
                className="border-border-default bg-surface-2 text-text-body hover:text-text cursor-pointer rounded-full border px-[11px] py-[5px] text-[11.5px] transition-colors"
                style={{ fontWeight: 550 }}
              >
                Hoje
              </Link>
            )}
            <Link
              href={`${base}?data=${semanaAnterior}`}
              aria-label="Semana anterior"
              className="border-border-default bg-surface-2 text-text-body hover:text-text grid size-[26px] cursor-pointer place-items-center rounded-full border transition-colors"
            >
              <IconSetaDireita size={13} className="rotate-180" />
            </Link>
            <Link
              href={`${base}?data=${semanaSeguinte}`}
              aria-label="Próxima semana"
              className="border-border-default bg-surface-2 text-text-body hover:text-text grid size-[26px] cursor-pointer place-items-center rounded-full border transition-colors"
            >
              <IconSetaDireita size={13} />
            </Link>
          </div>
        )}

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
          className={`border-border-default bg-surface-2 text-text-body hover:text-text flex-none cursor-pointer rounded-full border px-[11px] py-[5px] text-[11.5px] transition-colors ${
            modo === "semana" ? "" : "ml-auto"
          }`}
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
              const eventosDaCelula = celula.data ? (eventosPorData.get(celula.data) ?? []) : [];

              // Dia de fora do mes existe so' pra grade fechar na coluna
              // certa: ele nao recebe aula nem no prototipo.
              const vazio =
                celula.foraDoMes ||
                (aulasDoDia.length === 0 && eventosDaCelula.length === 0);

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

                  {!vazio && (
                    <>
                      {aulasDoDia.map((aula) => (
                        <BlocoDaAula
                          key={`${celula.chave}-${aula.id}`}
                          aula={aula}
                          mostrarTurma={!nomeDaTurma}
                          aoEditar={setEmEdicao}
                          compacto
                          cancelada={canceladas.has(
                            `${aula.id}|${celula.data}`,
                          )}
                        />
                      ))}
                      <EventosDoDia
                        eventos={eventosDaCelula}
                        aoAbrir={
                          celula.data
                            ? (evento) =>
                                setEventoAberto({
                                  data: celula.data as string,
                                  evento,
                                })
                            : undefined
                        }
                      />
                    </>
                  )}
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

          // A data REAL desta coluna na semana exibida. E' ela que liga a
          // coluna aos eventos: a grade sabe o dia da semana, so' a tela sabe
          // qual semana esta em exibicao.
          const dataDoDia = datas.get(numero);
          const chaveDoDia = dataDoDia ? comoISO(dataDoDia) : "";
          const eventosDoDia = eventosPorData.get(chaveDoDia) ?? [];

          // No celular, dia vazio nao ocupa uma faixa inteira dizendo "Sem
          // aula" — ele simplesmente sai. No computador ele FICA, senao a
          // grade encolhe e as colunas desalinham entre semanas.
          if (aulas.length === 0 && eventosDoDia.length === 0) {
            return (
              <div
                key={numero}
                // Sem o botao o dia vazio some no celular (ver a nota acima).
                // COM ele a coluna vazia passa a ser o lugar onde a primeira
                // aula do dia nasce, entao ela fica visivel nos dois tamanhos.
                className={`bg-surface-2 min-h-[110px] flex-col gap-1.5 rounded-[9px] border px-[11px] pt-[11px] pb-[13px] md:flex ${
                  podeAdicionar ? "flex" : "hidden"
                }`}
                style={ESTILO_DO_DIA}
              >
                <span className="text-text-muted mb-[9px] flex items-baseline gap-[5px] text-[10px] font-semibold tracking-[0.08em] uppercase">
                  {ABREVIACAO[numero]}
                  <span className="text-[11px] tabular-nums opacity-70">
                    {datas.get(numero)?.getDate()}
                  </span>
                </span>
                {criandoNoDia !== numero &&
                  eventoAberto?.data !== chaveDoDia &&
                  eventosDoDia.length === 0 && (
                    <span className="text-text-muted text-[11px] italic opacity-70">
                      Sem aula
                    </span>
                  )}
                <EventosDoDia
                  eventos={eventosDoDia}
                  aoAbrir={(evento) =>
                    setEventoAberto({ data: chaveDoDia, evento })
                  }
                />
                <RodapeDoDia numero={numero} />
                <BotaoNovoEvento data={chaveDoDia} />
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
                  cancelada={canceladas.has(`${aula.id}|${chaveDoDia}`)}
                />
              ))}

              {/* Depois das aulas: o evento comenta o dia, e ler o comentario
                  antes do que ele comenta inverte a leitura. */}
              <EventosDoDia
                eventos={eventosDoDia}
                aoAbrir={(evento) =>
                  setEventoAberto({ data: chaveDoDia, evento })
                }
              />


              <RodapeDoDia numero={numero} />
              <BotaoNovoEvento data={chaveDoDia} />
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
        materias={materias}
        aoFechar={() => setEmEdicao(null)}
        aoSalvar={() => {
          setEmEdicao(null);
          router.refresh();
        }}
      />

      {/* Os modais ficam FORA das colunas de proposito: dentro de uma coluna
          eles herdariam o `overflow` dela e seriam cortados. */}
      {criandoNoDia !== null && (
        <ModalNovaAula
          diaSemana={criandoNoDia}
          turmaId={turmaId ?? null}
          turmas={turmas}
          materias={materias}
          turno={turno}
          aoCancelar={() => setCriandoNoDia(null)}
          aoSalvar={(turmaDaAula, dados) =>
            criarAulaNoDia(turmaDaAula, criandoNoDia, dados)
          }
        />
      )}

      {eventoAberto && (
        <FormularioEvento
          data={eventoAberto.data}
          turmaId={turmaId ?? null}
          turmas={turmas}
          aulasDoDia={aulasDoDiaDaData(eventoAberto.data)}
          evento={eventoAberto.evento}
          aoCancelar={() => setEventoAberto(null)}
          aoSalvar={salvarEvento}
          aoApagar={
            eventoAberto.evento
              ? () => apagarEvento(eventoAberto.evento!.id)
              : undefined
          }
        />
      )}
    </section>
  );
}
