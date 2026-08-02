import { AppShell } from "@/components/layout/app-shell";

/**
 * Esqueleto da tela do Cup AI enquanto as conversas chegam.
 *
 * Dentro do AppShell de proposito: o menu e o cabecalho ja' podem ser
 * desenhados, e so' o miolo espera. Trocar a tela inteira por um vazio faria a
 * navegacao "piscar" a cada visita.
 */
export default function CarregandoIa() {
  return (
    <AppShell titulo="Cup AI">
      <div className="mx-auto flex max-w-3xl animate-pulse flex-col gap-6">
        <div className="bg-surface-2 h-28 rounded-xl" />
        <div className="flex flex-col gap-2">
          <div className="bg-surface-2 h-14 rounded-xl" />
          <div className="bg-surface-2 h-14 rounded-xl" />
          <div className="bg-surface-2 h-14 rounded-xl" />
        </div>
      </div>
    </AppShell>
  );
}
