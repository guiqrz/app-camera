/**
 * Icones da interface, em SVG tracado.
 *
 * Transcritos dos desenhos (Figma e Claude Design) em vez de virem de uma
 * biblioteca: sao poucos, mantem o traco exato do design e evitam mais uma
 * dependencia. Todos herdam a cor do texto (`currentColor`), entao mudam
 * junto com o tema sem nenhuma regra extra.
 *
 * Regra: icone e' decorativo quando ha texto ao lado (aria-hidden), e precisa
 * de rotulo proprio quando esta sozinho num botao.
 */

type IconProps = {
  /** Lado do icone em pixels. Padrao 18, o tamanho usado no menu. */
  size?: number;
  className?: string;
};

function base(size: number, className?: string) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg",
    // Decorativo por padrao: quem usa sozinho poe o rotulo no botao.
    "aria-hidden": true,
    focusable: false,
    className,
  } as const;
}

export function IconAulas({ size = 18, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path
        d="M12 3l9 5-9 5-9-5 9-5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M6 12v5c0 1.1 2.7 3 6 3s6-1.9 6-3v-5" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

export function IconChamada({ size = 18, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path
        d="M9 11l3 3L22 4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function IconRelatorios({ size = 18, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <rect x="3" y="12" width="4" height="8" rx="1" stroke="currentColor" strokeWidth="1.8" />
      <rect x="10" y="8" width="4" height="12" rx="1" stroke="currentColor" strokeWidth="1.8" />
      <rect x="17" y="4" width="4" height="16" rx="1" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

export function IconIA({ size = 18, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <circle cx="12" cy="12" r="3.2" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

export function IconAdministracao({ size = 18, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <rect x="3" y="4" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
      <rect x="14" y="4" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
      <rect x="3" y="13" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
      <rect x="14" y="13" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

export function IconConfiguracoes({ size = 18, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.14.5.5.93 1 1.13.3.11.63.16 1 .16H21a2 2 0 1 1 0 4h-.09c-.5 0-.86.34-1 .84Z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
}

export function IconTurma({ size = 17, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="1.8" />
      <path d="M3 20c0-3 2.7-5 6-5s6 2 6 5" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="17" cy="9" r="2.4" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M15.5 14.2c2.4.3 4.5 1.9 4.5 4.3"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function IconCalendario({ size = 17, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M3 9h18M8 2v4M16 2v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function IconBusca({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
      <path d="M21 21l-4.3-4.3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function IconSeta({ size = 14, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function IconSetaDireita({ size = 14, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path
        d="M5 12h13M13 6l6 6-6 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Espelho exato de IconSetaDireita — mesmo traco, mesma bitola. */
export function IconSetaEsquerda({ size = 14, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path
        d="M19 12H6M11 6l-6 6 6 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Círculo com "i" — o aviso de procedência ("gerado pela Cupcam…"). */
export function IconInfo({ size = 13, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <g
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        fill="none"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M12 16v-4M12 8h.01" />
      </g>
    </svg>
  );
}

/**
 * Triangulo de atencao — as faixas ambar de aviso.
 *
 * Diferente do `IconInfo` (circulo com "i"), que apenas explica: este marca
 * que ha uma consequencia a tratar. Substitui o emoji `⚠` que as
 * Configuracoes usavam, e que renderiza diferente em cada sistema.
 */
export function IconAlerta({ size = 14, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <g
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      >
        <path d="M10.3 3.9 2.4 17.5a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
        <path d="M12 9.5v4M12 17.2h.01" />
      </g>
    </svg>
  );
}

/** Estrela de 4 pontas — o selo da Cup AI no botao "Gerar com a Cup AI". */
export function IconEstrela({ size = 13, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path
        d="M12 3l1.9 5.8H20l-4.9 3.6 1.9 5.8-5-3.6-5 3.6 1.9-5.8L4 8.8h6.1z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

/** Pessoa com um check ao lado — frequencia/presenca da turma. */
export function IconPresenca({ size = 18, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <g
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      >
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="m17 11 2 2 4-4" />
      </g>
    </svg>
  );
}

/**
 * Chevron do botao que recolhe a sidebar. Gira 180deg quando ela ja' esta
 * recolhida, pra apontar sempre pro lado que a acao leva.
 */
export function IconRecolherMenu({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path
        d="M15 18l-6-6 6-6"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconSino({ size = 18, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M6 8a6 6 0 1 1 12 0c0 3 1 5 2 6H4c1-1 2-3 2-6Z" stroke="currentColor" strokeWidth="1.7" />
      <path d="M9.5 19a2.5 2.5 0 0 0 5 0" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

export function IconSol({ size = 18, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <circle cx="12" cy="12" r="4.2" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M12 2v2.4M12 19.6V22M4.9 4.9l1.7 1.7M17.4 17.4l1.7 1.7M2 12h2.4M19.6 12H22M4.9 19.1l1.7-1.7M17.4 6.6l1.7-1.7"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function IconLua({ size = 18, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path
        d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconTendencia({ size = 18, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path
        d="M3 17l6-6 4 4 8-8"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M15 7h6v6" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconRaio({ size = 18, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path
        d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconQueda({ size = 18, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path
        d="M3 7l6 6 4-4 8 8"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M15 17h6v-6" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconRelogio({ size = 18, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 7v5l3.5 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconCheck({ size = 18, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M8 12l3 3 5-6"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconMenu({ size = 22, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function IconFechar({ size = 22, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/* --- Icones da tela Fazer Chamada --- */

export function IconCamera({ size = 18, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <rect x="3" y="6" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M17 10l4-2v8l-4-2" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}

/** Check sem circulo — o traco dos botoes Presente do desenho. */
export function IconCheckSimples({ size = 14, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path
        d="M20 6L9 17l-5-5"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconPessoaPresente({ size = 18, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="1.8" />
      <path d="M3 20c0-3 2.7-5 6-5s6 2 6 5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M15 10l2 2 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconPessoaAusente({ size = 18, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="1.8" />
      <path d="M3 20c0-3 2.7-5 6-5s6 2 6 5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M16 8l4 4M20 8l-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

/* --- Icones da tela Administracao --- */

/** Grupo de pessoas — usado no stat card "Alunos matriculados". */
export function IconPessoas({ size = 18, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <circle cx="8.5" cy="8" r="3" stroke="currentColor" strokeWidth="1.8" />
      <path d="M2 20c0-3 2.6-5 6.5-5s6.5 2 6.5 5" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="17" cy="8.5" r="2.3" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M15.7 13.4c2.7.4 4.8 2 4.8 4.6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Sinal de "+" — botao "Adicionar" (turma ou aluno). */
export function IconMais({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

/** Retrato numa moldura — area de upload de foto no modal "Novo aluno". */
export function IconFoto({ size = 22, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="9" cy="10" r="2" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M3 16l5-4 3.5 3 4-3.5L21 16"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Lixeira — acao de excluir aluno na tabela. */
export function IconLixeira({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path
        d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m3 0-.8 12.1a2 2 0 0 1-2 1.9H8.8a2 2 0 0 1-2-1.9L6 7"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M10 11v6M14 11v6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function IconLapis({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path
        d="M4 20h4L18.5 9.5a2 2 0 0 0 0-2.8l-1.2-1.2a2 2 0 0 0-2.8 0L4 16v4Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="m13.5 6.5 4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Ponto de interrogacao em circulo — o "?" que abre o balao de ajuda. */
export function IconInterrogacao({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M9.6 9.4a2.5 2.5 0 0 1 4.9.6c0 1.7-2.5 2-2.5 3.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      {/* Ponto como traco de comprimento zero: mantem o mesmo peso visual dos
          outros icones, que sao todos tracado e nenhum preenchido. */}
      <path d="M12 16.8v.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/** Rosto simplificado — o cadastro biometrico, na tela de Privacidade. */
export function IconRosto({ size = 18, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="9.2" cy="10.2" r="1" fill="currentColor" />
      <circle cx="14.8" cy="10.2" r="1" fill="currentColor" />
      <path d="M8.6 14.6a4.2 4.2 0 0 0 6.8 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

/** Prancheta com linhas — a ficha de dados do aluno. */
export function IconFicha({ size = 18, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path
        d="M8 4h8a1 1 0 0 1 1 1v1H7V5a1 1 0 0 1 1-1Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M7 6H6a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1h-1"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M9 11h6M9 15h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

/** Cadeado fechado — armazenamento protegido por chave. */
export function IconCadeado({ size = 18, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <rect x="4.5" y="10" width="15" height="10" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8.5 10V7.5a3.5 3.5 0 0 1 7 0V10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

/** Balanca de dois pratos — o principio que decide o uso de cada dado. */
export function IconBalanca({ size = 18, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M12 4v16M7 20h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M5 7h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M5 7 2.5 13h5L5 7ZM19 7l-2.5 6h5L19 7Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}

/** Microfone — captura de audio da aula ligada. */
export function IconMicrofone({ size = 18, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <rect x="9" y="2.5" width="6" height="11" rx="3" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M5.5 11a6.5 6.5 0 0 0 13 0"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path d="M12 17.5v4M9 21.5h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Microfone cortado — captura desligada.
 *
 * O corte diagonal e' o que distingue os dois estados sem depender de cor
 * (WCAG 1.4.1): quem nao percebe a diferenca entre vermelho e cinza ainda ve a
 * barra atravessando o desenho.
 */
export function IconMicrofoneCortado({ size = 18, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <rect x="9" y="2.5" width="6" height="11" rx="3" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M5.5 11a6.5 6.5 0 0 0 13 0"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path d="M12 17.5v4M9 21.5h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M3.5 3.5l17 17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

/** Documento com linhas de texto — a transcricao da aula. */
export function IconTranscricao({ size = 18, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path
        d="M6 3h8l4 4v14H6V3Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M14 3v4h4" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path
        d="M9 12h6M9 16h6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Duas setas em ciclo — tentar de novo. */
export function IconRecomecar({ size = 18, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path
        d="M20 12a8 8 0 1 1-2.3-5.6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M20 4v4h-4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Quadro de sala de aula, com duas linhas escritas e o suporte embaixo.
 *
 * As linhas de dentro tem larguras diferentes de proposito: duas linhas iguais
 * leriam como "documento", e o que este icone precisa dizer e' "quadro com
 * algo escrito nele" — que e' exatamente o que o modo Lousa guarda.
 */
export function IconLousa({ size = 18, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <rect
        x="3"
        y="4"
        width="18"
        height="13"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M6.5 8.5h8M6.5 12h5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path d="M12 17v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path
        d="M9 20h6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function IconCopiar({ size = 18, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <rect
        x="9"
        y="9"
        width="11"
        height="11"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconBaixar({ size = 18, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path
        d="M12 3v12"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M7.5 10.5 12 15l4.5-4.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Clipe de papel — anexo da aula na agenda. */
/** Elo de corrente — o anexo que e' LINK, ao lado do clipe que e' arquivo. */
export function IconLink({ size = 18, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path
        d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.5 1.5M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.5-1.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconClipe({ size = 18, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path
        d="M21 11.5 12.5 20a5 5 0 0 1-7-7l8-8a3.5 3.5 0 0 1 5 5l-8 8a2 2 0 0 1-3-3l7.5-7.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}


/** Seta pra cima saindo de uma bandeja — enviar arquivo. */
export function IconSubir({ size = 18, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path
        d="M12 16V4M7 9l5-5 5 5"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M20 16v3a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-3"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Porta com seta saindo — encerrar a sessao (sair). */
export function IconSair({ size = 18, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path
        d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M16 17l5-5-5-5M21 12H9"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* Olho de mostrar/esconder senha, so' nas paginas de link (visual do Strix).
   Phosphor Regular `eye` e `eye-slash` (MIT), os mesmos glifos que o Strix
   carrega pela fonte de icones: preenchidos em viewBox 256, por isso nao
   passam pelo `base()` dos icones tracados. */
function basePreenchido(size: number, className?: string) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 256 256",
    fill: "currentColor",
    xmlns: "http://www.w3.org/2000/svg",
    "aria-hidden": true,
    focusable: false,
    className,
  } as const;
}

export function IconOlho({ size = 20, className }: IconProps) {
  return (
    <svg {...basePreenchido(size, className)}>
      <path d="M247.31,124.76c-.35-.79-8.82-19.58-27.65-38.41C194.57,61.26,162.88,48,128,48S61.43,61.26,36.34,86.35C17.51,105.18,9,124,8.69,124.76a8,8,0,0,0,0,6.5c.35.79,8.82,19.57,27.65,38.4C61.43,194.74,93.12,208,128,208s66.57-13.26,91.66-38.34c18.83-18.83,27.3-37.61,27.65-38.4A8,8,0,0,0,247.31,124.76ZM128,192c-30.78,0-57.67-11.19-79.93-33.25A133.47,133.47,0,0,1,25,128,133.33,133.33,0,0,1,48.07,97.25C70.33,75.19,97.22,64,128,64s57.67,11.19,79.93,33.25A133.46,133.46,0,0,1,231.05,128C223.84,141.46,192.43,192,128,192Zm0-112a48,48,0,1,0,48,48A48.05,48.05,0,0,0,128,80Zm0,80a32,32,0,1,1,32-32A32,32,0,0,1,128,160Z" />
    </svg>
  );
}

export function IconOlhoRiscado({ size = 20, className }: IconProps) {
  return (
    <svg {...basePreenchido(size, className)}>
      <path d="M53.92,34.62A8,8,0,1,0,42.08,45.38L61.32,66.55C25,88.84,9.38,123.2,8.69,124.76a8,8,0,0,0,0,6.5c.35.79,8.82,19.57,27.65,38.4C61.43,194.74,93.12,208,128,208a127.11,127.11,0,0,0,52.07-10.83l22,24.21a8,8,0,1,0,11.84-10.76Zm47.33,75.84,41.67,45.85a32,32,0,0,1-41.67-45.85ZM128,192c-30.78,0-57.67-11.19-79.93-33.25A133.16,133.16,0,0,1,25,128c4.69-8.79,19.66-33.39,47.35-49.38l18,19.75a48,48,0,0,0,63.66,70l14.73,16.2A112,112,0,0,1,128,192Zm6-95.43a8,8,0,0,1,3-15.72,48.16,48.16,0,0,1,38.77,42.64,8,8,0,0,1-7.22,8.71,6.39,6.39,0,0,1-.75,0,8,8,0,0,1-8-7.26A32.09,32.09,0,0,0,134,96.57Zm113.28,34.69c-.42.94-10.55,23.37-33.36,43.8a8,8,0,1,1-10.67-11.92A132.77,132.77,0,0,0,231.05,128a133.15,133.15,0,0,0-23.12-30.77C185.67,75.19,158.78,64,128,64a118.37,118.37,0,0,0-19.36,1.57A8,8,0,1,1,106,49.79,134,134,0,0,1,128,48c34.88,0,66.57,13.26,91.66,38.35,18.83,18.83,27.3,37.62,27.65,38.41A8,8,0,0,1,247.31,131.26Z" />
    </svg>
  );
}
