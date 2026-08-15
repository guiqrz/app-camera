import Link from "next/link";

import { IconRelogio, IconEstrela } from "@/components/ui/icons";
import { dataDoTimestamp, formatarDataExtensa } from "@/lib/format";
import type { ContinuidadeDaTurma } from "@/lib/types";

type OndeParieProps = {
  continuidade: ContinuidadeDaTurma;
  /** Turma desta página — vai junto no link pra Cup AI. */
  turmaId: number;
  /**
   * Matéria da última aula, quando conhecida.
   *
   * Vem de fora porque `AulaNoHistorico` não carrega esse campo: quem sabe a
   * matéria é a lista de aulas (`AulaCard`), que a página já busca. Cruzar
   * pelo `sessao_id` lá evita uma chamada nova só pra um rótulo.
   */
  materia?: string | null;
};

/**
 * "Você parou aqui" — a faixa fina do protótipo (`.onde-parei`).
 *
 * Fala SÓ da última aula. A lista de aulas anteriores e o parágrafo escrito
 * por IA saíram em 14/08 a pedido dele: as aulas anteriores já aparecem em
 * "Aulas desta turma" logo abaixo, e repetir o histórico aqui transformava uma
 * faixa de uma linha num card alto no meio da tela.
 *
 * Server component: só recebe dado pronto, sem estado nem interação. O botão é
 * um `<Link>`, então não precisa de JavaScript no navegador.
 *
 * ⚠️ O TEXTO EM DESTAQUE É O `ate_onde` GRAVADO NO BANCO, nunca um resumo de
 * modelo. Isso é anti-alucinação, não estética: o professor lê o registro real
 * da aula dele. Quem quiser texto gerado clica no botão e vai pro chat, onde
 * fica explícito que aquilo é IA falando.
 */
export function OndeParei({ continuidade, turmaId, materia }: OndeParieProps) {
  const { ultima_aula: ultima } = continuidade;

  // Turma sem nenhuma aula registrada. Não é erro: é turma nova, ou turma cujas
  // aulas rodaram antes de a feature existir.
  if (ultima === null) {
    return (
      <section className="flex items-center gap-[14px] rounded-[12px] px-[17px] py-[15px]" style={ESTILO_FAIXA}>
        <span style={ESTILO_ICONE} aria-hidden>
          <IconRelogio size={17} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-text-muted text-[9.5px] font-bold tracking-[0.11em] uppercase">
            Você parou aqui
          </div>
          <p className="text-text-muted mt-[3px] text-[13.5px]">
            Nenhuma aula desta turma tem conteúdo registrado ainda. O registro é
            gerado quando a aula termina.
          </p>
        </div>
      </section>
    );
  }

  const semRegistro = ultima.ate_onde.trim() === "";
  const data = formatarDataExtensa(dataDoTimestamp(ultima.data));

  // Pergunta já pronta: o professor cai no chat com o contexto carregado, em
  // vez de ter que descrever a própria aula pra IA.
  const perguntaInicial = semRegistro
    ? `Me ajude a planejar a próxima aula desta turma.`
    : `A última aula parou em: "${ultima.ate_onde}". Me ajude a planejar a próxima.`;

  return (
    <section
      className="flex flex-wrap items-center gap-[14px] rounded-[12px] px-[17px] py-[15px]"
      style={ESTILO_FAIXA}
    >
      <span style={ESTILO_ICONE} aria-hidden>
        <IconRelogio size={17} />
      </span>

      <div className="min-w-0 flex-1">
        <div className="text-text-muted text-[9.5px] font-bold tracking-[0.11em] uppercase">
          Você parou aqui
        </div>

        {semRegistro ? (
          <p className="text-text-muted mt-[3px] text-[13.5px]">
            Esta aula não registrou onde parou.
          </p>
        ) : (
          <p className="text-text mt-[3px] text-[13.5px] font-semibold">
            {ultima.ate_onde}
          </p>
        )}

        <p className="text-text-muted mt-[2px] text-[12px]">
          {data}
          {materia && ` · ${materia}`}
          {ultima.editado_em !== null && " · editado por você"}
        </p>
      </div>

      {/* Pílula de vidro com a moldura acesa (`.op-acao`). A moldura vem de um
          gradiente mascarado: `padding: 1px` + `mask-composite: exclude`
          recorta o miolo e deixa visível só a faixa da borda. */}
      <Link
        href={`/ia?turma=${turmaId}&sessao=${ultima.sessao_id}&pergunta=${encodeURIComponent(perguntaInicial)}`}
        className="group text-text-brand relative isolate flex flex-none items-center gap-[7px] rounded-full px-5 py-[10px] text-[12.5px] font-semibold transition-transform hover:-translate-y-px"
        style={{
          background: "var(--vidro-botao)",
          backdropFilter: "blur(28px) saturate(175%)",
        }}
      >
        <span
          className="pointer-events-none absolute inset-0 rounded-full p-px"
          style={{
            background: "var(--moldura-botao)",
            WebkitMask:
              "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
            mask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
            WebkitMaskComposite: "xor",
            maskComposite: "exclude",
          }}
          aria-hidden
        />
        <IconEstrela size={13} className="opacity-90" />
        Gerar com a Cup AI
      </Link>
    </section>
  );
}

/** O card com MENOS véu da tela — a mancha do fundo atravessa quase inteira. */
const ESTILO_FAIXA = {
  background: "var(--vidro-forte)",
  border: "1px solid var(--vidro-forte-borda)",
  backdropFilter: "blur(34px) saturate(170%)",
} as const;

const ESTILO_ICONE = {
  width: 38,
  height: 38,
  flex: "none",
  borderRadius: 11,
  background: "var(--materia-roxo-bg)",
  color: "var(--materia-roxo-fg)",
  display: "grid",
  placeItems: "center",
} as const;
