"use client";

import type { ComponentType, ReactNode } from "react";
import { useEffect, useState } from "react";

import { Secao, Linha } from "@/components/configuracoes/secao";
import {
  IconBalanca,
  IconCadeado,
  IconCamera,
  IconFicha,
  IconMicrofone,
  IconMicrofoneCortado,
  IconPessoas,
  IconRosto,
} from "@/components/ui/icons";
import { lerSempreGravar, salvarSempreGravar } from "@/lib/preferencias-audio";

/**
 * Aba "Privacidade" das Configuracoes.
 *
 * A maior parte do conteudo e' estatica, sem controle: as regras de
 * privacidade do projeto sao invariantes (ver CLAUDE.md), e transformar
 * qualquer uma delas em toggle criaria um jeito de desliga-las. Aqui a pessoa
 * LE o que o sistema faz.
 *
 * Cada afirmacao deste texto corresponde a uma garantia verificavel no
 * codigo. A de que engajamento nao tem coluna de aluno, por exemplo, e' o
 * schema da tabela `engajamento` em cupcam/persistencia/banco.py. Ao mudar o
 * comportamento do sistema, este texto precisa mudar junto.
 *
 * A UNICA excecao e' a secao "Gravacao de audio das aulas" no topo: essa e'
 * uma preferencia de conveniencia (como valor INICIAL do microfone na tela
 * Camera), nao uma regra de privacidade. Ela nao liga gravacao sozinha — o
 * professor sempre ve e confirma o estado antes de clicar Ligar — entao nao
 * abre a mesma brecha que um toggle nas regras invariantes abriria.
 */

type IconeProps = { size?: number; className?: string };

type TopicoProps = {
  Icone: ComponentType<IconeProps>;
  titulo: string;
  resumo: string;
  children: ReactNode;
};

/**
 * Um topico expansivel.
 *
 * `<details>` nativo em vez de estado no React: acessibilidade de teclado,
 * semantica e busca do navegador (Ctrl+F acha texto dentro de details fechado
 * nos navegadores atuais) vem de graca, sem JavaScript nenhum.
 */
function Topico({ Icone, titulo, resumo, children }: TopicoProps) {
  return (
    <details className="group border-b border-border-default last:border-b-0">
      <summary className="flex cursor-pointer list-none items-start gap-3.5 py-4 [&::-webkit-details-marker]:hidden">
        <Icone
          size={19}
          className="mt-0.5 flex-none text-text-muted transition-colors group-open:text-primary"
        />
        <span className="min-w-0 flex-1">
          <span className="block text-[0.94rem] font-medium text-text">
            {titulo}
          </span>
          <span className="mt-0.5 block text-[0.8rem] text-text-muted">
            {resumo}
          </span>
        </span>
        {/* Chevron em CSS puro: gira ao abrir, sem virar mais um SVG. */}
        <span
          className="mt-1.5 h-2 w-2 flex-none rotate-45 border-r-2 border-b-2 border-text-muted transition-transform group-open:-rotate-[135deg]"
          aria-hidden
        />
      </summary>
      <div className="max-w-[64ch] space-y-3 pb-5 pl-[2.1rem] text-[0.87rem] leading-[1.7] text-text-body">
        {children}
      </div>
    </details>
  );
}

/** Lista do que o sistema nao faz. O contraste importa mais que os itens. */
function NuncaFaz({ itens }: { itens: string[] }) {
  return (
    <div className="mt-4 border-l-2 border-danger pl-3.5">
      <p className="m-0 text-[0.7rem] font-semibold uppercase tracking-wider text-danger">
        O sistema não faz
      </p>
      <ul className="mt-1.5 space-y-1 text-[0.83rem] text-text-muted">
        {itens.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Switch "Sempre iniciar a camera gravando audio".
 *
 * Visual alinhado ao switch do `ControleMicrofone` (mesmo trilho, mesma
 * pilula), mas aqui e' uma preferencia, nao um controle ao vivo da captura:
 * por isso vive dentro de uma `Linha` como as outras preferencias de
 * Configuracoes, e nao tem faixa de "gravando" — nada esta gravando nesta
 * tela.
 */
function SwitchSempreGravar() {
  // Le' depois da montagem pra HTML do servidor e primeiro render do cliente
  // baterem — mesmo padrao de painel-geral.tsx:115..119 (localStorage e'
  // sistema externo, nao estado derivavel do render).
  const [ativo, setAtivo] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setAtivo(lerSempreGravar()), 0);
    return () => clearTimeout(id);
  }, []);

  const alternar = () => {
    const proximo = !ativo;
    setAtivo(proximo);
    salvarSempreGravar(proximo);
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={ativo}
      onClick={alternar}
      className="focus-visible:ring-primary flex items-center gap-2.5 rounded-xl border px-3.5 py-2 transition-colors focus-visible:ring-2 focus-visible:outline-none"
      style={{
        borderColor: ativo ? "var(--danger)" : "var(--border)",
        background: ativo ? "var(--danger-bg)" : "var(--surface)",
      }}
    >
      <span
        aria-hidden
        style={{ color: ativo ? "var(--danger-fg)" : "var(--text-muted)" }}
      >
        {ativo ? <IconMicrofone size={18} /> : <IconMicrofoneCortado size={18} />}
      </span>
      {/* Rotulo proprio, diferente de "Microfone ligado/desligado" do
          ControleMicrofone: ali o texto descreve um ESTADO ao vivo da
          captura; aqui descreve uma PREFERENCIA (o que vai acontecer da
          proxima vez), entao precisa deixar essa diferenca clara em vez de
          copiar o texto de um controle que fala de agora. */}
      <span
        className="text-sm font-extrabold"
        style={{ color: ativo ? "var(--danger-fg)" : "var(--text)" }}
      >
        {ativo ? "Sempre gravar" : "Não gravar"}
      </span>
      {/* Trilho do switch, so' decorativo — o estado real vai no aria-checked
          do botao (mesmo padrao do ControleMicrofone). */}
      <span
        aria-hidden
        className="relative h-6 w-11 shrink-0 rounded-full transition-colors"
        style={{ background: ativo ? "var(--danger)" : "var(--surface-2)" }}
      >
        <span
          className="absolute top-1 h-4 w-4 rounded-full bg-white transition-all"
          style={{ left: ativo ? "calc(100% - 1.25rem)" : "0.25rem" }}
        />
      </span>
    </button>
  );
}

export function PainelPrivacidade() {
  return (
    <div>
      <Secao
        titulo="Gravação de áudio das aulas"
        descricao="Vale só neste navegador."
      >
        <Linha
          rotulo="Sempre iniciar a câmera gravando áudio"
          apoio={
            "O microfone já vem marcado na tela de Câmera. Você ainda pode " +
            "desmarcar antes de ligar. O áudio é apagado assim que a " +
            "transcrição fica pronta, e a transcrição expira em 60 dias."
          }
        >
          <SwitchSempreGravar />
        </Linha>
      </Secao>

      <div className="rounded border border-border-default bg-surface px-5 py-1">
        <Topico
          Icone={IconCamera}
          titulo="O vídeo da aula não é gravado"
          resumo="A imagem é analisada e descartada na hora"
        >
          <p>
            A câmera capta a sala, mas nada daquela imagem fica salvo. Cada
            quadro é analisado na memória do computador, vira um número
            (quantas pessoas apareceram, qual a proporção de atenção) e é
            jogado fora logo em seguida. Quando o quadro seguinte chega, o
            anterior já não existe mais.
          </p>
          <p>
            Ninguém consegue voltar atrás e rever a aula. Nem a escola, nem
            quem mantém o sistema. Não existe arquivo de vídeo para rever,
            porque ele nunca chegou a ser criado.
          </p>
        </Topico>

        <Topico
          Icone={IconRosto}
          titulo="Como o reconhecimento facial funciona"
          resumo="A foto vira números e é apagada"
        >
          <p>
            Quando um aluno é cadastrado, a escola envia uma foto dele. Essa
            foto não fica guardada. Ela é convertida em uma sequência de
            números que descreve o rosto, algo como uma impressão digital
            matemática, e a foto original é descartada ainda na memória, sem
            nunca tocar o disco.
          </p>
          <p>
            É essa sequência que permite marcar presença sozinho. Durante a
            aula o sistema compara os rostos que vê com a lista da turma e
            anota quem apareceu. O professor confere e corrige o que estiver
            errado.
          </p>
          <p>
            A única imagem que sobra é uma miniatura do rosto, do tamanho de
            um ícone, que aparece ao lado do nome na tela de Coordenação. Ela
            existe para a escola reconhecer visualmente quem é quem na lista.
            Tem no máximo 128 pixels e qualidade baixa, o suficiente para
            identificar alguém que já está na lista, não para identificar
            alguém de fora dela.
          </p>
        </Topico>

        <Topico
          Icone={IconPessoas}
          titulo="Engajamento é da turma, nunca de um aluno"
          resumo="O sistema não sabe quem estava distraído"
        >
          <p>
            Esta é a parte mais importante. O CUPCAM mede a atenção da sala
            inteira, em frases como “70% da turma atenta neste minuto”. Ele
            nunca registra que um aluno específico estava distraído.
          </p>
          <p>
            Isso não é uma promessa de boa conduta. É uma impossibilidade de
            construção. A tabela onde o engajamento é gravado não tem uma
            coluna para o aluno. Ela guarda a sala, o horário e as
            porcentagens. Não existe lugar onde escrever o nome, então
            ninguém pode escrever, nem por engano nem de propósito depois.
          </p>
          <p>
            Quando o sistema observa comportamento, ele enxerga corpos numa
            sala, não pessoas com nome. Quando ele reconhece pessoas, é
            apenas para a chamada. Os dois caminhos nunca se cruzam.
          </p>
          <NuncaFaz
            itens={[
              "Dizer que o aluno X ficou desatento na terça",
              "Montar ranking de atenção entre alunos",
              "Gerar relatório de comportamento individual",
              "Guardar histórico de celular no bolso de alguém",
            ]}
          />
        </Topico>

        <Topico
          Icone={IconFicha}
          titulo="O que fica guardado sobre cada aluno"
          resumo="Nome, matrícula, turma e presença"
        >
          <p>
            A lista completa, sem nada escondido: nome, número de matrícula,
            turma, a miniatura do rosto, a sequência de números do
            reconhecimento e a presença em cada aula, com a informação de se
            foi detectada automaticamente e se o professor confirmou.
          </p>
          <p>
            Presença é um dado individual, e isso é intencional. É a razão de
            o sistema existir: ele poupa os dez minutos de chamada no começo
            de cada aula. É o mesmo dado que já estava no caderno do
            professor, só que preenchido sozinho.
          </p>
          <p>
            A diferença entre presença e comportamento é a linha que o
            projeto não atravessa. Faltar é um fato administrativo. Estar
            distraído é um julgamento sobre a pessoa, e esse o sistema não
            guarda de ninguém.
          </p>
        </Topico>

        <Topico
          Icone={IconCadeado}
          titulo="Onde os dados moram e quem alcança"
          resumo="No computador da escola, atrás de uma chave"
        >
          <p>
            Tudo fica em um único arquivo de banco de dados no computador da
            própria escola, o mesmo que está ligado à câmera. Não há nuvem,
            não há servidor de terceiros, não há empresa nenhuma recebendo
            cópia.
          </p>
          <p>
            Para que este app consiga mostrar as telas, existe uma passagem
            protegida por uma chave de acesso. Essa chave fica no servidor e
            nunca chega ao navegador. Ela não aparece no endereço nem no
            código da página. Quem tentar acessar os dados sem ela recebe
            apenas uma recusa.
          </p>
          <p>
            Se o computador for desligado, o sistema para. Os dados não estão
            em nenhum outro lugar.
          </p>
        </Topico>

        <Topico
          Icone={IconBalanca}
          titulo="O princípio por trás de tudo isso"
          resumo="Dado que ajuda o aluno pode existir; dado que o vigia, não"
        >
          <p>
            A regra que orienta cada decisão do projeto é simples de
            enunciar: um dado individual só existe se servir ao aluno ou ao
            professor. Nunca para puni-los, pressioná-los, ranqueá-los ou
            vigiá-los.
          </p>
          <p>
            É por isso que o reconhecimento facial é permitido. Ele devolve
            tempo de aula que a chamada consumia. E é pela mesma razão que a
            análise de comportamento nunca desce ao indivíduo: um relatório
            dizendo que um aluno se distrai muito não ajudaria esse aluno em
            nada. Só serviria para constrangê-lo.
          </p>
          <p>
            Quando aparece um uso novo para algum dado, a pergunta não é se
            dá para fazer. É se aquilo ajuda a pessoa de quem é o dado. Se a
            resposta não for um sim claro, não entra.
          </p>
        </Topico>
      </div>
    </div>
  );
}
