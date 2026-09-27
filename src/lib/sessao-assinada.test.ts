/**
 * Testes do cookie assinado. Rodar com `npm test` (node:test nativo, sem
 * dependencia nova — o Node >= 22.18 le TypeScript direto).
 *
 * O import usa a extensao `.ts` porque o Node resolve o arquivo sozinho, sem
 * bundler; por isso tambem o modulo testado nao pode usar o alias `@/`.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  assinarSessao,
  precisaRevalidar,
  type SessaoAssinada,
  verificarSessaoAssinada,
} from "./sessao-assinada.ts";

const SEGREDO = "segredo-de-teste-com-tamanho-suficiente-000";
const OUTRO_SEGREDO = "outro-segredo-de-teste-com-tamanho-suficiente";

/** Dados de uma sessao valida; cada teste troca so' o que interessa. */
function dados(extra: Partial<SessaoAssinada> = {}): SessaoAssinada {
  return {
    sessao: "abc_DEF-123",
    validadoEm: 1_790_000_000,
    nome: "Strix",
    email: "admin@escola.com",
    papel: "admin",
    ...extra,
  };
}

/** Separa o valor do cookie em [conteudo codificado, assinatura]. */
function partes(valor: string): [string, string] {
  const [conteudo, assinatura] = valor.split(".");
  return [conteudo!, assinatura!];
}

function codificar(objeto: unknown): string {
  return Buffer.from(JSON.stringify(objeto)).toString("base64url");
}

describe("assinarSessao + verificarSessaoAssinada", () => {
  it("devolve exatamente o que assinou, com nome, email e papel", async () => {
    const valor = await assinarSessao(dados(), SEGREDO);
    assert.match(valor, /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]{43}$/);
    assert.deepEqual(await verificarSessaoAssinada(valor, SEGREDO), dados());
  });

  it("aguenta ponto, acento e espaco no nome e ponto na sessao", async () => {
    const valor = await assinarSessao(
      dados({ sessao: "a.b.c", nome: "Ana Lúcia S. Prado", email: "ana.prado@escola.com" }),
      SEGREDO,
    );
    const lida = await verificarSessaoAssinada(valor, SEGREDO);
    assert.equal(lida?.sessao, "a.b.c");
    assert.equal(lida?.nome, "Ana Lúcia S. Prado");
  });

  it("recusa papel trocado mantendo a assinatura (professor virando admin)", async () => {
    const valor = await assinarSessao(dados({ papel: "professor" }), SEGREDO);
    const [, assinatura] = partes(valor);
    const adulterado = `${codificar({ ...dados(), papel: "admin" })}.${assinatura}`;
    assert.equal(await verificarSessaoAssinada(adulterado, SEGREDO), null);
  });

  it("recusa validadoEm adiantado pra fugir da revalidacao", async () => {
    const valor = await assinarSessao(dados({ validadoEm: 100 }), SEGREDO);
    const [, assinatura] = partes(valor);
    const adulterado = `${codificar({ ...dados(), validadoEm: 999_999 })}.${assinatura}`;
    assert.equal(await verificarSessaoAssinada(adulterado, SEGREDO), null);
  });

  it("recusa assinatura com um caractere trocado", async () => {
    const valor = await assinarSessao(dados(), SEGREDO);
    const ultimo = valor.at(-1) === "A" ? "B" : "A";
    assert.equal(await verificarSessaoAssinada(valor.slice(0, -1) + ultimo, SEGREDO), null);
  });

  it("recusa valor assinado com outro segredo", async () => {
    const valor = await assinarSessao(dados(), OUTRO_SEGREDO);
    assert.equal(await verificarSessaoAssinada(valor, SEGREDO), null);
  });

  it("recusa o formato antigo (sessao.validadoEm.assinatura) sem lancar", async () => {
    // Cookie gravado antes de 27/09/2026: o professor so' precisa logar de novo.
    const assinaturaQualquer = "A".repeat(43);
    assert.equal(
      await verificarSessaoAssinada(`sessao.1790000000.${assinaturaQualquer}`, SEGREDO),
      null,
    );
  });

  it("recusa formatos quebrados sem lancar", async () => {
    const [conteudo, assinatura] = partes(await assinarSessao(dados(), SEGREDO));
    const quebrados = [
      "",
      "inventado",
      `${conteudo}.`, // assinatura vazia
      `.${assinatura}`, // conteudo vazio
      `${conteudo}.${assinatura}x`, // assinatura comprida demais
      `${conteudo}.${assinatura.slice(0, -1)}+`, // caractere fora do base64url
      `${conteudo}+.${assinatura}`, // conteudo fora do base64url
    ];
    for (const valor of quebrados) {
      assert.equal(await verificarSessaoAssinada(valor, SEGREDO), null, valor);
    }
  });

  it("recusa conteudo bem assinado mas com forma errada", async () => {
    // Defesa em profundidade: mesmo com a assinatura certa (bug nosso ao
    // gravar), um campo com tipo errado nao pode virar sessao.
    const { assinarConteudoParaTeste } = await import("./sessao-assinada.ts");
    const errados = [
      { ...dados(), validadoEm: "100" },
      { ...dados(), validadoEm: -1 },
      { ...dados(), sessao: "" },
      { ...dados(), papel: 7 },
      { sessao: "s", validadoEm: 1 },
      [1, 2, 3],
      "texto",
    ];
    for (const objeto of errados) {
      const valor = await assinarConteudoParaTeste(codificar(objeto), SEGREDO);
      assert.equal(await verificarSessaoAssinada(valor, SEGREDO), null, JSON.stringify(objeto));
    }
  });

  it("nunca assina com segredo vazio", async () => {
    await assert.rejects(assinarSessao(dados(), ""));
    await assert.rejects(verificarSessaoAssinada("x.y", ""));
  });

  it("recusa assinar entrada invalida", async () => {
    await assert.rejects(assinarSessao(dados({ sessao: "" }), SEGREDO));
    await assert.rejects(assinarSessao(dados({ validadoEm: -1 }), SEGREDO));
    await assert.rejects(assinarSessao(dados({ validadoEm: 1.5 }), SEGREDO));
  });
});

describe("precisaRevalidar", () => {
  it("nao revalida dentro do intervalo", () => {
    assert.equal(precisaRevalidar(1000, 1300), false);
  });

  it("revalida passado o intervalo", () => {
    assert.equal(precisaRevalidar(1000, 1301), true);
  });

  it("tolera relogio levemente adiantado, mas nao muito", () => {
    assert.equal(precisaRevalidar(1060, 1000), false);
    assert.equal(precisaRevalidar(1061, 1000), true);
  });
});
