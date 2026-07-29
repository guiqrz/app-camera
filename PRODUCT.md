# Product

## Register

product

## Users

Três perfis, num mesmo app:

1. **Professor, depois da aula (uso principal).** No computador, com calma.
   Revisa o relatório da aula, confere a chamada que a câmera montou, olha
   tendência da turma ao longo do tempo. É aqui que o app entrega valor.
2. **Coordenação/direção.** Mantém a base em dia: cadastra turmas, matérias,
   alunos e a grade semanal. Olha panorama, não uma aula isolada.
3. **Professor, durante a aula (uso mais raro hoje).** Ao vivo o app mostra só
   duas coisas: percentual de atenção coletiva (com sinal quando cai abaixo de
   70%) e a chamada. Escopo pequeno de propósito por ora — deve crescer.

## Product Purpose

Mostrar ao professor o que o CUPCAM (câmera + reconhecimento facial + medição
de atenção) coleta na sala de aula, transformado em decisão.

Três dores, na ordem de importância:

1. **Faltam dados pra justificar decisões.** O professor precisa de histórico e
   tendência pra conversar com coordenação e com a família com número na mão,
   não com impressão.
2. **"Não sei se a turma está entendendo."** Engajamento coletivo dá um sinal
   que o professor não consegue medir sozinho enquanto dá aula.
3. **Chamada é perda de tempo.** A câmera já viu quem está lá; o app só precisa
   ser rápido pra confirmar ou corrigir.

Sucesso: o professor abre o relatório e sai com uma conclusão, não com uma tela
de números pra interpretar.

## Brand Personality

Confiável, direto, profissional. Uma ferramenta de trabalho que respeita o
tempo de quem usa — não um brinquedo e não um sistema burocrático.

Voz: português claro e humano, sem jargão técnico e sem infantilizar. Rótulo
escrito por extenso ganha de ícone bonito e ambíguo.

## Anti-references

Quatro coisas que o app não pode parecer:

- **Sistema escolar velho/burocrático.** Diário de classe do governo: tabela
  cinza, formulário infinito, nada respira, tudo exige três cliques.
- **Ferramenta de vigilância.** Nenhum clima de monitorar aluno individualmente.
  Isso já é regra de código (engajamento é sempre coletivo e anônimo), e a
  interface tem que sustentar a mesma promessa.
- **Dashboard SaaS genérico.** Número gigante com gradiente, cards idênticos
  repetidos, muito gráfico e pouca decisão.
- **Rede social / gamificado.** Sem badge, streak, confete ou ranking de aluno.

## Design Principles

1. **Navegação antes de enfeite.** Chegar onde precisa em menos passos vale
   mais que qualquer refinamento visual. Prioridade declarada do projeto.
2. **A tela conclui, não só informa.** Todo dado exibido responde a uma
   pergunta do professor. Número sem leitura é ruído.
3. **Coletivo por construção.** A privacidade não é um aviso na tela, é a forma
   como os dados são desenhados. Nenhuma tela oferece um caminho pra medir
   atenção de uma pessoa.
4. **"Sem dado" é uma resposta.** `null` da API aparece como ausência explícita,
   nunca como zero. Confundir os dois mentiria sobre a turma.
5. **Duas mãos, dois contextos.** Depois da aula é computador e calma; durante a
   aula é celular, pressa e uma mão. A mesma tela precisa servir aos dois.

## Accessibility & Inclusion

Meta WCAG 2.2 AA como piso: contraste 4.5:1 em texto corrido, foco sempre
visível, tudo alcançável por teclado, alvo de toque ≥44px.

Considerações do contexto de sala de aula:

- **Reduced motion** respeitado em toda animação.
- **Sem sinal apenas por cor.** As faixas de atenção (verde/amarelo/vermelho)
  precisam de rótulo ou ícone junto — daltonismo é comum e a decisão depende
  dessa leitura.
- **Professor não-técnico.** Sem gesto escondido, sem ícone sem rótulo, sem
  jargão de produto.
