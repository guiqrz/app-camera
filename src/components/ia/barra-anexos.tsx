"use client";

import { IconFechar } from "@/components/ui/icons";
import type { Anexo } from "@/lib/types";

/** Formatos que o modelo lê. Qualquer outro e' recusado na hora do anexo. */
export const FORMATOS_ACEITOS = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "text/plain",
  "text/markdown",
] as const;

/** Espelha TAMANHO_MAXIMO_ANEXO_BYTES do backend (cupcam/web/api.py). */
export const TAMANHO_MAXIMO_MB = 20;
const TAMANHO_MAXIMO_BYTES = TAMANHO_MAXIMO_MB * 1024 * 1024;

/**
 * Teto do corpo INTEIRO da requisicao, somando todos os arquivos.
 *
 * Espelha LIMITE_CORPO_REQUISICAO_BYTES do backend (api.py): 20 MB do maior
 * anexo + 1 MB de folga do envelope multipart. E' um limite SEPARADO do de cada
 * arquivo — dois PDFs de 15 MB passam um a um e estouram somados, e sem esta
 * conta o professor so' descobriria isso depois de subir 30 MB pra tomar 413.
 *
 * A margem de 512 KB fica de fora do que aceitamos: o envelope multipart cobra
 * boundary e cabecalho por campo, e o texto da pergunta viaja no mesmo corpo.
 * Recusar um pouco antes do teto real e' melhor que deixar passar no limite e
 * quebrar no servidor.
 */
const LIMITE_CORPO_MB = 21;
const LIMITE_CORPO_BYTES = LIMITE_CORPO_MB * 1024 * 1024 - 512 * 1024;

/** Soma o tamanho dos arquivos ja' anexados. Aula nao ocupa corpo (vai como ID). */
function somarBytes(anexos: Anexo[]): number {
  return anexos.reduce(
    (total, anexo) => total + (anexo.tipo === "arquivo" ? anexo.arquivo.size : 0),
    0,
  );
}

/**
 * Valida um arquivo antes de anexar. Devolve o motivo, ou null se estiver ok.
 *
 * Recusa AQUI, e nao no envio: descobrir que o arquivo nao serve depois de
 * escrever a pergunta inteira e esperar o envio seria perder o trabalho a toa.
 *
 * `jaAnexados` entra na conta porque o backend limita o corpo inteiro, nao so'
 * cada arquivo — ver LIMITE_CORPO_BYTES.
 *
 * O `.md` entra pela extensao alem do MIME porque o Windows nao registra
 * `text/markdown` — o navegador manda tipo vazio, e o arquivo seria recusado
 * sem motivo real.
 */
export function validarArquivo(arquivo: File, jaAnexados: Anexo[] = []): string | null {
  const aceitoPeloTipo = (FORMATOS_ACEITOS as readonly string[]).includes(
    arquivo.type,
  );
  const aceitoPelaExtensao = /\.(md|markdown|txt)$/i.test(arquivo.name);

  if (!aceitoPeloTipo && !aceitoPelaExtensao) {
    return `${arquivo.name} não é um formato aceito. Envie PDF, PNG, JPEG, TXT ou Markdown.`;
  }
  if (arquivo.size > TAMANHO_MAXIMO_BYTES) {
    return `${arquivo.name} passa de ${TAMANHO_MAXIMO_MB} MB.`;
  }
  if (somarBytes(jaAnexados) + arquivo.size > LIMITE_CORPO_BYTES) {
    return `Somados, os anexos passam de ${LIMITE_CORPO_MB} MB — ${arquivo.name} não cabe. Remova algum antes.`;
  }
  return null;
}

/**
 * Estimativa de tokens de um anexo.
 *
 * Texto: ~4 caracteres por token, a regra de bolso usada pra portugues e ingles.
 * PDF: 258 tokens por pagina (numero do proprio Gemini). Como o navegador nao
 * abre o PDF pra contar paginas sem uma biblioteca so' pra isso, estimamos as
 * paginas por tamanho — ~40 KB por pagina em PDF de texto.
 *
 * Imagem tem custo fixo por bloco no Gemini; 258 e' a conta de uma imagem
 * pequena, que e' o caso comum (foto de exercicio, print de slide).
 *
 * E' ESTIMATIVA de contexto, nao cobranca — ver o rotulo em BarraAnexos.
 */
function estimarTokens(anexo: Anexo): number {
  if (anexo.tipo === "aula") return Math.ceil(anexo.caracteres / 4);

  const { arquivo } = anexo;
  if (arquivo.type === "application/pdf") {
    const paginas = Math.max(1, Math.round(arquivo.size / 40_000));
    return paginas * 258;
  }
  if (arquivo.type.startsWith("image/")) return 258;
  return Math.ceil(arquivo.size / 4);
}

/** Soma a estimativa de todos os anexos, pro rotulo do contador. */
function estimarTotalDeTokens(anexos: Anexo[]): number {
  return anexos.reduce((total, anexo) => total + estimarTokens(anexo), 0);
}

type BarraAnexosProps = {
  anexos: Anexo[];
  aoRemover: (indice: number) => void;
};

/** Chave estavel do chip — o File nao tem id, entao nome+tamanho servem. */
function chaveDoAnexo(anexo: Anexo, indice: number): string {
  return anexo.tipo === "aula"
    ? `aula-${anexo.sessaoId}`
    : `arquivo-${anexo.arquivo.name}-${anexo.arquivo.size}-${indice}`;
}

/**
 * Anexos da pergunta, como chips removiveis, com a estimativa de contexto.
 *
 * Fica ACIMA do campo de digitar: o professor precisa ver o que vai junto
 * ANTES de enviar, nao descobrir depois pela resposta.
 */
export function BarraAnexos({ anexos, aoRemover }: BarraAnexosProps) {
  if (anexos.length === 0) return null;

  const tokens = estimarTotalDeTokens(anexos);

  return (
    <div className="flex flex-col gap-1.5">
      <ul className="flex flex-wrap gap-2">
        {anexos.map((anexo, indice) => {
          const rotulo =
            anexo.tipo === "aula" ? anexo.rotulo : anexo.arquivo.name;

          return (
            <li
              key={chaveDoAnexo(anexo, indice)}
              className="border-border-default bg-surface-2 flex max-w-full items-center gap-1.5 rounded-lg border py-1.5 pr-1.5 pl-2.5"
            >
              <span className="text-text truncate text-xs font-bold">{rotulo}</span>
              <button
                type="button"
                onClick={() => aoRemover(indice)}
                className="text-text-muted hover:text-text flex-none rounded p-0.5 transition-colors"
                aria-label={`Remover ${rotulo}`}
              >
                <IconFechar size={13} />
              </button>
            </li>
          );
        })}
      </ul>

      {/* "estimativa" no rotulo de proposito: o numero e' aproximado e nao
          corresponde a cobranca nenhuma. Dizer so' o numero faria o professor
          tratar como conta fechada. */}
      <p className="text-text-muted text-xs">
        ~{tokens.toLocaleString("pt-BR")} tokens no contexto (estimativa)
      </p>
    </div>
  );
}
