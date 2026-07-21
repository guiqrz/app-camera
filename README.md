# 🎓 Cupcam Insights — app do professor

Site que mostra ao professor os dados que o **CUPCAM** coleta na sala de aula:
chamada automática, engajamento coletivo da turma e relatórios por aula.

Este repositório é só o **site**. O sistema que olha a câmera, reconhece os
alunos e mede a atenção vive em outro repositório (`projeto_Cupcam`), e os dois
conversam por uma API HTTP.

```
navegador  →  Next.js (Vercel)  →  túnel cloudflared  →  API do CUPCAM (notebook)
                    ↑
              a chave da API mora aqui e nunca sai daqui
```

---

## 🚀 Como rodar

Precisa de **Node.js 20+** e do backend do CUPCAM rodando.

**1. Instale as dependências**

```bash
npm install
```

**2. Configure o ambiente**

```bash
# Windows (PowerShell)
Copy-Item .env.example .env.local
```

Abra `.env.local` e confira os dois valores:

| Variável | O que é |
|---|---|
| `CUPCAM_API_URL` | Endereço da API. Local: `http://127.0.0.1:8000`. Com túnel: a URL que o `cloudflared` imprime |
| `CUPCAM_API_KEY` | A chave secreta. Precisa ser **igual** à do backend |

**3. Ligue a API do CUPCAM** (no outro repositório)

```bash
cd caminho/para/projeto_Cupcam
py -m uvicorn cupcam.web.api:app --port 8000
```

> ⚠️ Rode esse comando **de dentro** da pasta `projeto_Cupcam`. Fora dela o
> Python não acha o pacote e dá `ModuleNotFoundError: No module named 'cupcam'`.

**4. Ligue o site**

```bash
npm run dev
```

Abra <http://localhost:3000>.

---

## 🔐 Segurança — leia antes de mexer

A API fica exposta na internet pelo túnel e entrega **nome e RA de alunos**.
A única coisa que impede qualquer pessoa de ler isso é a `CUPCAM_API_KEY`.

Por isso:

- 🚫 **A chave nunca vai para o navegador.** `src/lib/api.ts` importa
  `server-only`: se algum componente de navegador (`"use client"`) importar esse
  arquivo, **o build quebra de propósito** em vez de embutir a chave no
  JavaScript do usuário.
- 🚫 **Nunca prefixe a chave com `NEXT_PUBLIC_`.** Esse prefixo publica a
  variável no navegador — seria exatamente o vazamento que estamos evitando.
- ✅ **Componentes de navegador falam com nossas rotas em `src/app/api/`**, que
  rodam no servidor e chamam a API de lá.
- ✅ `.env.local` está no `.gitignore` e nunca é versionado.

---

## 📁 Estrutura

```
src/
  app/              telas (uma pasta = uma rota)
  components/
    theme/          tema claro/escuro
  lib/
    api.ts          cliente HTTP (server-only, injeta a chave)
    types.ts        tipos das respostas da API
  styles/
    tokens.css      cores e escalas da marca
    semantic.css    tokens por tema (claro/escuro)
```

---

## 🎨 Design

O visual vem do design system **Strix / Cupcam**: paleta violeta/ciano,
tipografia Geologica (títulos) + Inter (texto), com temas claro e escuro.

Regra de ouro: **use sempre os tokens semânticos** (`--surface`, `--text`,
`--primary`), nunca as cores cruas (`--violet-500`). Os semânticos trocam
sozinhos entre claro e escuro; os crus, não.

Todas as telas funcionam no celular e no computador.

---

## 🔒 Privacidade — a regra que não se negocia

O CUPCAM mede engajamento de forma **coletiva e anônima**. Nunca por aluno.

Alguns desenhos das telas mostram "engajamento" numa coluna por aluno — isso
foi um **erro de nomenclatura no design**. O que aparece ali é **frequência**
(presença histórica), que é um dado individual legítimo e vem pronto da API no
campo `frequencia_pct`.

Ao implementar qualquer tela: se o desenho pedir engajamento de uma pessoa
específica, troque por frequência. Não existe esse dado no banco, e não deve
passar a existir.

---

## 📊 Estado atual

| Tela | Situação |
|---|---|
| Fundação (tokens, tema, cliente da API) | ✅ pronta |
| Fazer Chamada | 🔲 a fazer |
| Minhas Aulas | 🔲 a fazer |
| Relatório | 🔲 a fazer |
| Administração | 🔲 a fazer (depende de rotas novas na API) |

---

## 🛠️ Comandos

| Comando | O que faz |
|---|---|
| `npm run dev` | Liga o site em modo desenvolvimento |
| `npm run build` | Gera a versão de produção |
| `npm run lint` | Verifica o código |
| `npx tsc --noEmit` | Confere os tipos |
