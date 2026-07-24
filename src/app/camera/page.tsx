import { AppShell } from "@/components/layout/app-shell";
import { VistaCamera } from "@/components/camera/vista-camera";

/**
 * Tela "Camera" (item "Camera" do menu).
 *
 * Simples de proposito: toda a logica de estado ao vivo (polling, ligar,
 * desligar) fica no client component, aqui so' monta a moldura da pagina.
 */
export default function CameraPage() {
  return (
    <AppShell titulo="Câmera">
      <VistaCamera />
    </AppShell>
  );
}
