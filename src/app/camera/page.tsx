import { AppShell } from "@/components/layout/app-shell";
import { VistaCamera } from "@/components/camera/vista-camera";
import { ApiError, listarTurmas } from "@/lib/api";
import type { Turma } from "@/lib/types";

/**
 * Tela "Camera" (item "Camera" do menu).
 *
 * Busca a lista de turmas no servidor (pro seletor de "qual turma iniciar") e
 * passa pro client component, que cuida do estado ao vivo (polling, ligar,
 * desligar). Se o backend estiver fora, a tela ainda abre com lista vazia e
 * ligar cai no automatico por horario.
 */
export default async function CameraPage() {
  let turmas: Turma[] = [];
  try {
    turmas = await listarTurmas();
  } catch (causa) {
    // Backend fora / tunel caido: nao quebra a tela. O seletor fica so' com
    // "Automatico"; o polling do estado assume quando o backend voltar.
    if (!(causa instanceof ApiError)) throw causa;
  }

  return (
    <AppShell titulo="Câmera">
      <VistaCamera turmas={turmas} />
    </AppShell>
  );
}
