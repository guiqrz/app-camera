import type { ReactNode } from "react";

import { IconAlerta } from "@/components/ui/icons";

/**
 * Blocos de layout compartilhados pelas abas das Configuracoes.
 *
 * Existem pra que cada aba nao repita a mesma marcacao de painel e de linha —
 * e pra que a separacao entre linhas seja decidida num lugar so'.
 *
 * A casca e' a mesma do `.coord-painel` da Coordenacao (vidro + blur +
 * sombra). Antes esta tela era a unica em Tailwind cru (`bg-surface` +
 * `border-border-default`), o que a deixava chapada ao lado das outras.
 */

type SecaoProps = {
  titulo: string;
  descricao?: string;
  children: ReactNode;
};

/** Painel que agrupa configuracoes de um mesmo assunto. */
export function Secao({ titulo, descricao, children }: SecaoProps) {
  return (
    <section className="cfg-painel">
      <div className="cfg-painel-topo">
        <h2 className="cfg-painel-titulo">{titulo}</h2>
        {descricao !== undefined && (
          <p className="cfg-painel-apoio">{descricao}</p>
        )}
      </div>
      {children}
    </section>
  );
}

/**
 * Titulo que separa dois grupos de paineis.
 *
 * As Configuracoes respondem a duas perguntas diferentes — "o que eu escolho"
 * e "o que o sistema esta fazendo" — e antes as cinco secoes vinham empilhadas
 * sem essa divisao, com preferencia e diagnostico misturados.
 */
export function GrupoTitulo({ children }: { children: ReactNode }) {
  return <h3 className="cfg-grupo">{children}</h3>;
}

/**
 * Container das linhas de um painel.
 *
 * Separado da `Secao` porque nem todo painel e' uma lista de linhas: o da
 * Privacidade guarda `<details>`, e o de diagnostico termina com uma faixa de
 * aviso que nao deve herdar a borda das linhas.
 */
export function Linhas({ children }: { children: ReactNode }) {
  return <div className="cfg-linhas">{children}</div>;
}

type LinhaProps = {
  rotulo: string;
  /** Texto de apoio: explica a consequencia, nao repete o rotulo. */
  apoio?: string;
  /** Icone opcional a esquerda do rotulo. */
  icone?: ReactNode;
  /**
   * Marca a linha como inerte (a configuracao ainda nao existe). Desbota o
   * rotulo sem esconde-lo — ele continua sendo a resposta pra quem veio
   * procurar aquilo.
   */
  inerte?: boolean;
  /** O controle ou o valor, a direita. */
  children: ReactNode;
};

/** Uma configuracao: rotulo e apoio a esquerda, controle a direita. */
export function Linha({
  rotulo,
  apoio,
  icone,
  inerte = false,
  children,
}: LinhaProps) {
  return (
    <div className="cfg-linha" data-inerte={inerte ? "sim" : undefined}>
      <div className="cfg-linha-texto">
        <p className="cfg-linha-rotulo">
          {icone !== undefined && <span aria-hidden>{icone}</span>}
          {rotulo}
        </p>
        {apoio !== undefined && <p className="cfg-linha-apoio">{apoio}</p>}
      </div>
      {children}
    </div>
  );
}

/** Valor so' de leitura, em fonte monoespacada (ids, enderecos, versoes). */
export function ValorFixo({ children }: { children: ReactNode }) {
  return <span className="cfg-valor">{children}</span>;
}

/** Selo de "isto ainda nao existe". Nao e' pilula de estado. */
export function Selo({ children }: { children: ReactNode }) {
  return <span className="cfg-selo">{children}</span>;
}

type PilulaProps = {
  tom: "ok" | "erro" | "neutro";
  /**
   * Estado que esta acontecendo AGORA (API respondendo, camera ligada): o
   * ponto pulsa. Em "Fora do ar" o pulso sugeriria atividade onde nao ha.
   */
  vivo?: boolean;
  children: ReactNode;
};

/** Pilula de estado, com ponto colorido. */
export function Pilula({ tom, vivo = false, children }: PilulaProps) {
  return (
    <span
      className="cfg-pilula"
      data-tom={tom}
      data-vivo={vivo ? "sim" : undefined}
    >
      <span className="cfg-pilula-ponto" aria-hidden />
      {children}
    </span>
  );
}

/**
 * Faixa ambar de aviso, presa ao pe do painel que ela explica.
 *
 * Fica DENTRO do painel de proposito: antes o aviso do `SALA_ID` flutuava
 * solto abaixo dos cartoes, separado do dado que o causa.
 */
export function Aviso({ children }: { children: ReactNode }) {
  return (
    <div className="cfg-aviso">
      <IconAlerta size={15} className="cfg-aviso-icone" />
      <span>{children}</span>
    </div>
  );
}

/**
 * Recado de resultado de uma acao (salvando / salvo / falhou).
 *
 * Numa faixa propria, e nao ao lado do controle: aparecendo e sumindo ali,
 * empurraria o `<select>` de lugar a cada troca.
 */
export function Recado({
  tom = "neutro",
  children,
}: {
  tom?: "neutro" | "erro";
  children: ReactNode;
}) {
  return (
    <p
      className="cfg-recado"
      data-tom={tom === "erro" ? "erro" : undefined}
      role={tom === "erro" ? "alert" : "status"}
    >
      {children}
    </p>
  );
}
