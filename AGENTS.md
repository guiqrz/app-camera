<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# Regras deste projeto — app-cupcam

Frontend do CUPCAM. O backend (câmera, reconhecimento facial, banco) vive em
outro repositório, `projeto_Cupcam`, e é consumido por uma API HTTP.

## 🔐 Segurança — inegociável

A API fica exposta na internet por um túnel e serve **nome e RA de alunos**.
A `CUPCAM_API_KEY` é a única barreira.

- `src/lib/api.ts` importa `server-only`. **Nunca** importe esse módulo de um
  componente `"use client"` — o build quebra de propósito, e é assim que deve
  ser.
- **Nunca** prefixe a chave com `NEXT_PUBLIC_`. Isso a publicaria no navegador.
- Componentes de navegador falam com rotas em `src/app/api/`, que rodam no
  servidor e chamam `src/lib/api.ts` de lá.

## 🔒 Privacidade

Engajamento é **sempre coletivo e anônimo**, nunca por aluno.

Se um desenho de tela pedir "engajamento" numa coluna por aluno, isso é erro de
nomenclatura do design: troque por **frequência** (`frequencia_pct`, presença
histórica). Esse dado individual é legítimo; o de atenção por pessoa não existe
no banco e não deve passar a existir.

## 🎨 Design

- Use **sempre** os tokens semânticos (`--surface`, `--text`, `--primary`).
  Nunca as escalas cruas (`--violet-500`) direto na interface — só os
  semânticos respeitam tema claro/escuro.
- Toda tela funciona no celular e no computador, nos dois temas.
- O menu lateral segue o **Figma**: lilás claro com texto escuro. A versão do
  Claude Design (gradiente roxo, texto branco) foi descartada.

## 🧱 Código

- Comentários e documentação em **português**; identificadores em **inglês**.
- Comente o *porquê* e o não óbvio, não o que o código já diz.
- Componentes pequenos e reutilizáveis, uma responsabilidade cada.
- `null` da API significa "sem dado" — mostre isso na tela. Nunca troque por
  `0`, que significaria "medimos e deu zero" (ex.: turma 100% desatenta).

## 📦 Commits

- **Commit a cada ~25% de progresso da tela, DURANTE a construção** — não
  espere a tela ficar pronta para commitar de uma vez. Essa convenção já é a
  autorização: não precisa pedir ok de novo a cada commit.
- Mensagem simples no formato `Tela: descricao curta`, sem acentos.
  Ex.: `Chamada: lista de alunos com marcacao otimista e resumo ao vivo`.
- **Sem coautor/colaborador** na mensagem (nada de `Co-Authored-By`), e sem
  citar porcentagem.
- `push` só com ordem explícita do usuário.
- Fora dessa convenção, nenhum comando git que altere o repositório sem ordem
  explícita (leitura — `status`, `log`, `diff` — é sempre livre).

## ✅ Antes de considerar pronto

```bash
npx tsc --noEmit      # tipos
npm run lint          # padrões
npm run build         # compila
```
