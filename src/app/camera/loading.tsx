import { AppShell } from "@/components/layout/app-shell";

/**
 * Esqueleto da tela "Camera".
 *
 * Mesma razao do `loading.tsx` de /configuracoes (22/08/2026): a pagina le a
 * lista de turmas no servidor antes de devolver HTML, e ate 04/09/2026 nao
 * havia nada na tela enquanto a API pensava.
 *
 * Aqui o vao pesa mais que o normal porque a leitura pode ser LENTA de
 * proposito: a rota de camera fala com a API do NOTEBOOK, por tunel, e nao com
 * a da nuvem — ver a nota das duas APIs. Tunel frio e' justamente o caso em que
 * a espera aparece.
 *
 * O desenho acompanha o estado "Camera parada" da VistaCamera (um cartao
 * central de `max-w-lg`), que e' o primeiro que a maioria das aberturas mostra.
 */
export default function CarregandoCamera() {
  return (
    <AppShell titulo="Câmera">
      <div className="flex animate-pulse flex-col gap-7">
        {/* O titulo da tela e a linha de apoio abaixo dele */}
        <div className="flex flex-col gap-1.5">
          <div className="bg-surface-2 h-8 w-48 rounded-lg" />
          <div className="bg-surface-2 h-4 w-72 max-w-full rounded" />
        </div>

        {/* O cartao central: circulo do icone, titulo, texto, campos e botao */}
        <div className="border-border-default bg-surface shadow-card mx-auto flex w-full max-w-lg flex-col items-center gap-5 rounded-[12px] border p-10">
          <div className="bg-surface-2 h-16 w-16 rounded-full" />
          <div className="flex w-full flex-col items-center gap-2">
            <div className="bg-surface-2 h-5 w-40 rounded" />
            <div className="bg-surface-2 h-4 w-64 max-w-full rounded" />
          </div>

          {/* "Turma a iniciar" e "Modo inicial" */}
          {Array.from({ length: 2 }, (_, indice) => (
            <div key={indice} className="flex w-full flex-col gap-1.5">
              <div className="bg-surface-2 h-3 w-28 rounded" />
              <div className="bg-surface-2 h-11 w-full rounded-xl" />
            </div>
          ))}

          <div className="bg-surface-2 h-11 w-full rounded-[9px]" />
        </div>
      </div>

      <span className="sr-only" role="status">
        Carregando a câmera...
      </span>
    </AppShell>
  );
}
