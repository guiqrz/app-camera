import Link from "next/link";

import { BotaoProximaAula } from "@/components/aulas/botao-proxima-aula";
import { IconAlerta, IconCalendario, IconCheck } from "@/components/ui/icons";
import type { AtrasoDaTurma } from "@/lib/types";

/**
 * "O que vem" — o par de futuro do "Você parou aqui" (features F10 e F11).
 *
 * POR QUE ESTA FAIXA EXISTE
 * -------------------------
 * O produto inteiro era um retrovisor: como foi a aula, o que foi dado, onde
 * eu parei, quem faltou. Nada respondia "e agora?". Esta faixa é o eixo de
 * futuro, e ela só é possível porque o cronograma (F9) existe — sem ele, o
 * modelo teria que INVENTAR a sequência pedagógica, que é exatamente o que a
 * trava do `ia/continuidade.py` foi construída pra impedir.
 *
 * A TRAVA QUE GOVERNA ESTE COMPONENTE
 * -----------------------------------
 * Futuro é sempre sugestão do app PARA o professor, nunca informação SOBRE o
 * professor pra outra pessoa.
 *
 * Este componente não tem, e não pode ganhar, uma versão pra coordenação. Um
 * "professor atrasado" numa tela de gestão é o uso que o `PRODUCT.md` (linha
 * 123) proíbe — e um professor que se sente supervisionado por software
 * sabota o software. Foi por essa razão que a F5 foi cortada do lote.
 */

const ESTILO_FAIXA = {
  background: "var(--vidro-forte)",
  border: "1px solid var(--vidro-forte-borda)",
  backdropFilter: "blur(34px) saturate(170%)",
} as const;

/** Ícone à esquerda, no mesmo formato do "Você parou aqui". */
function Selo({
  children,
  tom,
}: {
  children: React.ReactNode;
  tom: "neutro" | "alerta";
}) {
  return (
    <span
      style={{
        width: 38,
        height: 38,
        flex: "none",
        borderRadius: 11,
        background:
          tom === "alerta" ? "var(--warn-bg)" : "var(--materia-roxo-bg)",
        color: tom === "alerta" ? "var(--warn-fg)" : "var(--materia-roxo-fg)",
        display: "grid",
        placeItems: "center",
      }}
      aria-hidden
    >
      {children}
    </span>
  );
}

function Rotulo({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-text-muted text-[9.5px] font-bold tracking-[0.11em] uppercase">
      {children}
    </div>
  );
}

type OQueVemProps = {
  turmaId: number;
  /** Feature F10. Null quando a rota falhou — a faixa some, sem erro na tela. */
  atraso: AtrasoDaTurma | null;
};

export function OQueVem({ turmaId, atraso }: OQueVemProps) {
  // Sem cronograma não há eixo de futuro nenhum: nem atraso a medir, nem
  // próxima aula a sugerir. Em vez de sumir calado, a faixa CONVIDA a montar o
  // cronograma — é a porta de entrada da feature, e sem ela a F9 seria uma
  // tela que ninguém descobre.
  const semCronograma = atraso !== null && !atraso.tem_cronograma;

  if (atraso === null) return null;

  if (semCronograma) {
    return (
      <section
        className="flex flex-wrap items-center gap-[14px] rounded-[12px] px-[17px] py-[15px]"
        style={ESTILO_FAIXA}
      >
        <Selo tom="neutro">
          <IconCalendario size={17} />
        </Selo>

        <div className="min-w-0 flex-1">
          <Rotulo>O que vem</Rotulo>
          <p className="text-text-muted mt-[3px] text-[13.5px] leading-snug">
            Esta turma ainda não tem cronograma. Com ele, o app avisa quando
            você sai do plano e sugere o que vem na próxima aula.
          </p>
        </div>

        <Link
          href={`/aulas/${turmaId}/cronograma`}
          className="text-text-brand flex flex-none items-center gap-[7px] rounded-full px-5 py-[10px] text-[12.5px] font-semibold transition-transform hover:-translate-y-px"
          style={{
            background: "var(--vidro-botao)",
            backdropFilter: "blur(28px) saturate(175%)",
            border: "1px solid var(--vidro-forte-borda)",
          }}
        >
          <IconCalendario size={13} className="opacity-90" />
          Montar cronograma
        </Link>
      </section>
    );
  }

  const emDia = atraso?.tem_cronograma && !atraso.atrasado;
  const atrasado = atraso?.tem_cronograma && atraso.atrasado;

  return (
    <section
      className="flex flex-col gap-[13px] rounded-[12px] px-[17px] py-[15px]"
      style={ESTILO_FAIXA}
    >
      {/* --- F10: o cronograma está em dia? --- */}
      {atraso?.tem_cronograma && (
        <div className="flex flex-wrap items-center gap-[14px]">
          <Selo tom={atrasado ? "alerta" : "neutro"}>
            {atrasado ? <IconAlerta size={17} /> : <IconCheck size={17} />}
          </Selo>

          <div className="min-w-0 flex-1">
            <Rotulo>O que vem</Rotulo>

            {/* A mensagem vem PRONTA do backend, e é ele quem decide o tom.
                Reescrevê-la aqui faria a mesma avaliação sair diferente na
                tela e na API — e a conta de aulas viraria duas verdades. */}
            <p
              className={`mt-[3px] text-[13.5px] leading-snug ${
                atrasado ? "text-text font-semibold" : "text-text-body"
              }`}
            >
              {atraso.mensagem}
            </p>

            {emDia && atraso.aulas_restantes > 0 && (
              <p className="text-text-muted mt-[2px] text-[12px]">
                {atraso.aulas_restantes}{" "}
                {atraso.aulas_restantes === 1 ? "aula" : "aulas"} até o fim do
                período.
              </p>
            )}
          </div>

          <Link
            href={`/aulas/${turmaId}/cronograma`}
            className="text-text-brand flex flex-none items-center gap-[7px] rounded-full px-5 py-[10px] text-[12.5px] font-semibold transition-transform hover:-translate-y-px"
            style={{
              background: "var(--vidro-botao)",
              backdropFilter: "blur(28px) saturate(175%)",
              border: "1px solid var(--vidro-forte-borda)",
            }}
          >
            Ver cronograma
          </Link>
        </div>
      )}

      {/* --- F11: o que dar na próxima aula ---
          Sob demanda, num componente de cliente: a rota gasta chamada de IA, e
          carregá-la junto da tela faria toda abertura de "Minhas aulas" pagar
          uma geração de texto que o professor não pediu. */}
      {atraso.tem_cronograma && <BotaoProximaAula turmaId={turmaId} />}

    </section>
  );
}
