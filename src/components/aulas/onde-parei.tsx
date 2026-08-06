import { IconRelogio } from "@/components/ui/icons";
import { dataDoTimestamp, formatarDataExtensa } from "@/lib/format";
import type { AulaNoHistorico, ContinuidadeDaTurma } from "@/lib/types";

type OndeParieProps = {
  continuidade: ContinuidadeDaTurma;
};

/**
 * "Onde parei nesta turma?" — o ponto de parada da ultima aula e o historico.
 *
 * Server component: os dados ja chegam prontos da pagina, que os busca junto
 * das outras chamadas. Nao ha estado nem interacao aqui, entao "use client"
 * so' custaria JavaScript no navegador sem dar nada em troca.
 *
 * A HIERARQUIA DESTE CARD E' DELIBERADA. O `ate_onde` gravado no banco vem
 * primeiro e em destaque; o paragrafo da IA vem depois, rotulado. O motivo e'
 * anti-alucinacao, nao estetica: se o modelo inventar continuidade, o professor
 * tem o dado real na mesma tela pra comparar. Trocar a ordem — ou mostrar so' o
 * paragrafo — apagaria essa checagem.
 */
export function OndeParei({ continuidade }: OndeParieProps) {
  const { ultima_aula: ultima, aulas, paragrafo, erro_ia } = continuidade;

  // Turma sem nenhuma aula registrada. Nao e' erro: e' turma nova, ou turma
  // cujas aulas rodaram antes de a feature existir.
  if (ultima === null) {
    return (
      <section
        className="border-border-default flex flex-col gap-2 rounded-2xl border p-5"
        style={{ background: "var(--surface)" }}
      >
        <Cabecalho />
        <p className="text-text-muted text-sm leading-relaxed">
          Nenhuma aula desta turma tem conteúdo registrado ainda. O registro é
          gerado quando a aula termina.
        </p>
      </section>
    );
  }

  const anteriores = aulas.slice(1);

  return (
    <section
      className="border-border-default flex w-full flex-col gap-4 rounded-2xl border p-5"
      style={{ background: "var(--surface)" }}
    >
      <Cabecalho />

      <PontoDeParada aula={ultima} />

      {paragrafo !== null && (
        <div className="flex flex-col gap-1.5">
          <p className="text-text-body text-sm leading-relaxed">{paragrafo}</p>
          {/* Rotulo explicito: o professor precisa saber o que foi escrito por
              modelo e o que veio do registro da aula. */}
          <p className="text-text-muted text-xs font-semibold">
            Resumo escrito por IA a partir dos registros acima.
          </p>
        </div>
      )}

      {/* Falha de IA e' aviso calmo, nao vermelho: o dado que importa (o ponto
          de parada) esta' logo acima, e a tela continua util sem o paragrafo. */}
      {paragrafo === null && erro_ia !== null && (
        <p className="text-text-muted text-xs leading-relaxed">
          Não foi possível gerar o resumo automático desta vez. O registro das
          aulas continua abaixo.
        </p>
      )}

      {anteriores.length > 0 && <AulasAnteriores aulas={anteriores} />}
    </section>
  );
}

function Cabecalho() {
  return (
    <div className="flex items-center gap-2">
      <IconRelogio size={16} className="text-text-muted shrink-0" />
      <h2 className="text-text text-sm font-extrabold">Onde você parou</h2>
    </div>
  );
}

/** O destaque: a ultima aula e o ponto de parada gravado nela. */
function PontoDeParada({ aula }: { aula: AulaNoHistorico }) {
  const semRegistro = aula.ate_onde.trim() === "";

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-text-muted text-xs font-semibold">
          Última aula · {formatarDataExtensa(dataDoTimestamp(aula.data))}
        </span>
        {aula.editado_em !== null && (
          <span className="text-text-muted text-xs font-semibold">
            · editado por você
          </span>
        )}
      </div>

      {semRegistro ? (
        // Aula sem material (fonte 'nenhuma') ou aula que nao produziu ponto de
        // parada. Dizer isso e' melhor que deixar o espaco vazio: o professor
        // entende por que nao ha texto, em vez de achar que a tela quebrou.
        <p className="text-text-muted text-sm leading-relaxed">
          Esta aula não registrou onde parou.
        </p>
      ) : (
        <p className="text-text text-base leading-relaxed font-semibold">
          {aula.ate_onde}
        </p>
      )}

      {aula.topicos.length > 0 && <Topicos topicos={aula.topicos} />}
    </div>
  );
}

function AulasAnteriores({ aulas }: { aulas: AulaNoHistorico[] }) {
  return (
    <div className="border-border-default flex flex-col gap-3 border-t pt-4">
      <h3 className="text-text-muted text-xs font-extrabold tracking-wide uppercase">
        Aulas anteriores
      </h3>

      <ul className="flex flex-col gap-3">
        {aulas.map((aula) => (
          <li key={aula.sessao_id} className="flex flex-col gap-1.5">
            <span className="text-text-muted text-xs font-semibold">
              {formatarDataExtensa(dataDoTimestamp(aula.data))}
            </span>
            {aula.ate_onde.trim() !== "" ? (
              <p className="text-text-body text-sm leading-relaxed">
                {aula.ate_onde}
              </p>
            ) : (
              <p className="text-text-muted text-sm leading-relaxed">
                Sem registro de onde a aula parou.
              </p>
            )}
            {aula.topicos.length > 0 && <Topicos topicos={aula.topicos} />}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Topicos({ topicos }: { topicos: string[] }) {
  return (
    <ul className="flex flex-wrap gap-1.5">
      {topicos.map((topico) => (
        <li
          key={topico}
          className="text-text-body rounded-lg px-2.5 py-1 text-xs font-semibold"
          style={{ background: "var(--surface-2)" }}
        >
          {topico}
        </li>
      ))}
    </ul>
  );
}
