import type { ComponentType, ReactNode } from "react";

import {
  IconBalanca,
  IconCadeado,
  IconCamera,
  IconFicha,
  IconPessoas,
  IconRosto,
} from "@/components/ui/icons";

/**
 * Aba "Privacidade" das Configuracoes.
 *
 * Conteudo estatico, sem nenhum controle: as regras de privacidade do projeto
 * sao invariantes (ver CLAUDE.md), e transformar qualquer uma delas em toggle
 * criaria um jeito de desliga-las. Aqui a pessoa LE o que o sistema faz.
 *
 * Cada afirmacao deste texto corresponde a uma garantia verificavel no
 * codigo. A de que engajamento nao tem coluna de aluno, por exemplo, e' o
 * schema da tabela `engajamento` em cupcam/persistencia/banco.py. Ao mudar o
 * comportamento do sistema, este texto precisa mudar junto.
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

export function PainelPrivacidade() {
  return (
    <div className="rounded border border-border-default bg-surface px-5 py-1">
      <Topico
        Icone={IconCamera}
        titulo="O vídeo da aula não é gravado"
        resumo="A imagem é analisada e descartada na hora"
      >
        <p>
          A câmera capta a sala, mas nada daquela imagem fica salvo. Cada quadro
          é analisado na memória do computador, vira um número (quantas pessoas
          apareceram, qual a proporção de atenção) e é jogado fora logo em
          seguida. Quando o quadro seguinte chega, o anterior já não existe
          mais.
        </p>
        <p>
          Ninguém consegue voltar atrás e rever a aula. Nem a escola, nem quem
          mantém o sistema. Não existe arquivo de vídeo para rever, porque ele
          nunca chegou a ser criado.
        </p>
      </Topico>

      <Topico
        Icone={IconRosto}
        titulo="Como o reconhecimento facial funciona"
        resumo="A foto vira números e é apagada"
      >
        <p>
          Quando um aluno é cadastrado, a escola envia uma foto dele. Essa foto
          não fica guardada. Ela é convertida em uma sequência de números que
          descreve o rosto, algo como uma impressão digital matemática, e a foto
          original é descartada ainda na memória, sem nunca tocar o disco.
        </p>
        <p>
          É essa sequência que permite marcar presença sozinho. Durante a aula o
          sistema compara os rostos que vê com a lista da turma e anota quem
          apareceu. O professor confere e corrige o que estiver errado.
        </p>
        <p>
          A única imagem que sobra é uma miniatura do rosto, do tamanho de um
          ícone, que aparece ao lado do nome na tela de Coordenação. Ela existe
          para a escola reconhecer visualmente quem é quem na lista. Tem no
          máximo 128 pixels e qualidade baixa, o suficiente para identificar
          alguém que já está na lista, não para identificar alguém de fora
          dela.
        </p>
      </Topico>

      <Topico
        Icone={IconPessoas}
        titulo="Engajamento é da turma, nunca de um aluno"
        resumo="O sistema não sabe quem estava distraído"
      >
        <p>
          Esta é a parte mais importante. O CUPCAM mede a atenção da sala
          inteira, em frases como “70% da turma atenta neste minuto”. Ele nunca
          registra que um aluno específico estava distraído.
        </p>
        <p>
          Isso não é uma promessa de boa conduta. É uma impossibilidade de
          construção. A tabela onde o engajamento é gravado não tem uma coluna
          para o aluno. Ela guarda a sala, o horário e as porcentagens. Não
          existe lugar onde escrever o nome, então ninguém pode escrever, nem
          por engano nem de propósito depois.
        </p>
        <p>
          Quando o sistema observa comportamento, ele enxerga corpos numa sala,
          não pessoas com nome. Quando ele reconhece pessoas, é apenas para a
          chamada. Os dois caminhos nunca se cruzam.
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
          turma, a miniatura do rosto, a sequência de números do reconhecimento
          e a presença em cada aula, com a informação de se foi detectada
          automaticamente e se o professor confirmou.
        </p>
        <p>
          Presença é um dado individual, e isso é intencional. É a razão de o
          sistema existir: ele poupa os dez minutos de chamada no começo de cada
          aula. É o mesmo dado que já estava no caderno do professor, só que
          preenchido sozinho.
        </p>
        <p>
          A diferença entre presença e comportamento é a linha que o projeto não
          atravessa. Faltar é um fato administrativo. Estar distraído é um
          julgamento sobre a pessoa, e esse o sistema não guarda de ninguém.
        </p>
      </Topico>

      <Topico
        Icone={IconCadeado}
        titulo="Onde os dados moram e quem alcança"
        resumo="No computador da escola, atrás de uma chave"
      >
        <p>
          Tudo fica em um único arquivo de banco de dados no computador da
          própria escola, o mesmo que está ligado à câmera. Não há nuvem, não há
          servidor de terceiros, não há empresa nenhuma recebendo cópia.
        </p>
        <p>
          Para que este app consiga mostrar as telas, existe uma passagem
          protegida por uma chave de acesso. Essa chave fica no servidor e nunca
          chega ao navegador. Ela não aparece no endereço nem no código da
          página. Quem tentar acessar os dados sem ela recebe apenas uma recusa.
        </p>
        <p>
          Se o computador for desligado, o sistema para. Os dados não estão em
          nenhum outro lugar.
        </p>
      </Topico>

      <Topico
        Icone={IconBalanca}
        titulo="O princípio por trás de tudo isso"
        resumo="Dado que ajuda o aluno pode existir; dado que o vigia, não"
      >
        <p>
          A regra que orienta cada decisão do projeto é simples de enunciar: um
          dado individual só existe se servir ao aluno ou ao professor. Nunca
          para puni-los, pressioná-los, ranqueá-los ou vigiá-los.
        </p>
        <p>
          É por isso que o reconhecimento facial é permitido. Ele devolve tempo
          de aula que a chamada consumia. E é pela mesma razão que a análise de
          comportamento nunca desce ao indivíduo: um relatório dizendo que um
          aluno se distrai muito não ajudaria esse aluno em nada. Só serviria
          para constrangê-lo.
        </p>
        <p>
          Quando aparece um uso novo para algum dado, a pergunta não é se dá
          para fazer. É se aquilo ajuda a pessoa de quem é o dado. Se a resposta
          não for um sim claro, não entra.
        </p>
      </Topico>
    </div>
  );
}
