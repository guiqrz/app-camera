import { listarTurmas } from "@/lib/api";
import type { Turma } from "@/lib/types";

/**
 * Pagina de verificacao temporaria.
 *
 * Existe so' para provar que a fundacao esta de pe: tokens de cor, fontes,
 * tema claro/escuro e a conexao real com a API. Sera substituida pela tela
 * "Minhas Aulas" na proxima etapa.
 */
export default async function Home() {
  let turmas: Turma[] = [];
  let erro: string | null = null;

  try {
    turmas = await listarTurmas();
  } catch (causa) {
    erro = causa instanceof Error ? causa.message : "Erro desconhecido";
  }

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-8 p-10">
      <header>
        <h1
          className="text-text text-4xl font-extrabold"
          style={{ fontFamily: "var(--font-geologica)" }}
        >
          Cupcam Insights
        </h1>
        <p className="text-text-muted mt-2">
          Verificacao da fundacao — tokens, fontes e conexao com a API.
        </p>
      </header>

      <section className="border-border-default bg-surface shadow-card rounded-2xl border p-6">
        <h2 className="text-text mb-4 text-lg font-extrabold">
          Conexao com a API
        </h2>

        {erro ? (
          <div className="bg-danger-bg text-danger-fg rounded-xl p-4 text-sm">
            <strong className="block">Falhou.</strong>
            {erro}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="bg-ok-bg text-ok-fg rounded-xl p-4 text-sm">
              <strong>Funcionando.</strong> {turmas.length} turma(s)
              encontrada(s).
            </div>
            <ul className="flex flex-col gap-2">
              {turmas.map((turma) => (
                <li
                  key={turma.id}
                  className="border-border-default flex items-center justify-between rounded-xl border p-4"
                >
                  <span className="text-text font-bold">{turma.nome}</span>
                  <span className="text-text-muted text-sm">
                    {turma.hora_inicio} — {turma.hora_fim}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="border-border-default bg-surface shadow-card rounded-2xl border p-6">
        <h2 className="text-text mb-4 text-lg font-extrabold">
          Cores da marca
        </h2>
        <div className="flex flex-wrap gap-3">
          {[
            ["Primaria", "var(--primary)"],
            ["Acento", "var(--accent)"],
            ["Menu", "var(--sidebar-bg)"],
            ["Bom", "var(--ok)"],
            ["Medio", "var(--warn)"],
            ["Atencao", "var(--danger)"],
          ].map(([nome, cor]) => (
            <div key={nome} className="flex flex-col items-center gap-2">
              <div
                className="border-border-default h-14 w-14 rounded-xl border"
                style={{ background: cor }}
              />
              <span className="text-text-muted text-xs">{nome}</span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
