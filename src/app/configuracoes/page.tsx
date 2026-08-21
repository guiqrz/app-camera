import { AppShell } from "@/components/layout/app-shell";
import { VistaConfiguracoes } from "@/components/configuracoes/vista-configuracoes";
import {
  ApiError,
  lerEstadoCamera,
  listarAulasDaTurma,
  listarTurmas,
} from "@/lib/api";
import type { EstadoCamera, Turma } from "@/lib/types";

/**
 * Tela "Configuracoes" (item "Configuracoes" do menu).
 *
 * Busca no servidor o que as abas precisam e passa pro client component. Toda
 * leitura e' tolerante a falha: com o backend fora a tela ainda abre, porque
 * uma das abas (Privacidade) e' texto puro e a outra tem a propria sonda de
 * conexao — justamente a tela que a pessoa procura quando algo nao funciona.
 */

// A sala fixa da camera vive no config.py do backend e nao e' exposta por
// nenhuma rota. Ate existir uma (ver a nota de SALA_ID no README), o valor
// mora aqui, na variavel de ambiente — mesma origem do resto da configuracao
// de servidor deste app.
const SALA_DA_CAMERA = process.env.CUPCAM_SALA_ID ?? null;

/**
 * Quantas aulas o modo automatico consegue encontrar.
 *
 * O automatico cruza sala + dia + horario, e a sala e' a da TURMA. Turma de
 * outra sala fica invisivel pra ele — o professor precisa escolher a turma na
 * mao na tela Camera. Contar isso aqui transforma uma falha silenciosa (a
 * captura simplesmente nao acha aula nenhuma) num aviso na tela.
 */
async function contarAlcanceAutomatico(
  turmas: Turma[],
  salaId: string | null,
): Promise<{ alcancadas: number; total: number } | null> {
  if (salaId === null || turmas.length === 0) return null;

  try {
    const porTurma = await Promise.all(
      turmas.map(async (turma) => ({
        mesmaSala: turma.sala_id === salaId,
        aulas: (await listarAulasDaTurma(turma.id)).length,
      })),
    );

    return {
      alcancadas: porTurma
        .filter((t) => t.mesmaSala)
        .reduce((soma, t) => soma + t.aulas, 0),
      total: porTurma.reduce((soma, t) => soma + t.aulas, 0),
    };
  } catch (causa) {
    // Sem a contagem o aviso simplesmente nao aparece — nao vale derrubar a
    // tela por causa de um diagnostico.
    if (!(causa instanceof ApiError)) throw causa;
    return null;
  }
}

export default async function ConfiguracoesPage() {
  let turmas: Turma[] = [];
  let estadoCamera: EstadoCamera | null = null;

  // As duas leituras correm JUNTAS, e nao em fila. Elas falam com maquinas
  // diferentes (nuvem e notebook) e nenhuma depende do resultado da outra —
  // encadea-las com await somava as duas esperas por nada. Com o notebook
  // desligado, que e' o normal fora da aula, a soma era o que fazia esta tela
  // passar de 150s antes do timeout existir.
  //
  // allSettled, e nao all: um destino fora nao pode derrubar o outro. A camera
  // ausente e' esperada, e a tela sabe mostrar `estadoCamera` nulo.
  const [resultadoTurmas, resultadoCamera] = await Promise.allSettled([
    listarTurmas(),
    lerEstadoCamera(),
  ]);

  if (resultadoTurmas.status === "fulfilled") {
    turmas = resultadoTurmas.value;
  } else if (!(resultadoTurmas.reason instanceof ApiError)) {
    throw resultadoTurmas.reason;
  }

  if (resultadoCamera.status === "fulfilled") {
    estadoCamera = resultadoCamera.value;
  } else if (!(resultadoCamera.reason instanceof ApiError)) {
    throw resultadoCamera.reason;
  }

  // Esta depende de `turmas`, entao fica fora do paralelo acima de proposito.
  const alcanceAutomatico = await contarAlcanceAutomatico(
    turmas,
    SALA_DA_CAMERA,
  );

  return (
    <AppShell titulo="Configurações">
      <VistaConfiguracoes
        turmas={turmas}
        estadoCamera={estadoCamera}
        salaId={SALA_DA_CAMERA}
        alcanceAutomatico={alcanceAutomatico}
      />
    </AppShell>
  );
}
