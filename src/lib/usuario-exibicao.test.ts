/** Testes de usuario-exibicao.ts. Rodar com `npm test`. */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { iniciais, nomeDeExibicao, rotuloDoPapel } from "./usuario-exibicao.ts";

describe("rotuloDoPapel", () => {
  it("traduz os papeis conhecidos", () => {
    assert.equal(rotuloDoPapel("admin"), "Admin");
    assert.equal(rotuloDoPapel("coordenacao"), "Coordenação");
    assert.equal(rotuloDoPapel("professor"), "Professor");
  });

  it("devolve papel desconhecido como veio, em vez de sumir", () => {
    assert.equal(rotuloDoPapel("diretor"), "diretor");
  });
});

describe("nomeDeExibicao", () => {
  it("usa o nome quando existe, sem espacos nas pontas", () => {
    assert.equal(nomeDeExibicao("  Strix ", "admin@escola.com"), "Strix");
  });

  it("cai pra parte do email antes do @ quando o nome esta vazio", () => {
    assert.equal(nomeDeExibicao("", "ana.prado@escola.com"), "ana.prado");
    assert.equal(nomeDeExibicao("   ", "ana.prado@escola.com"), "ana.prado");
  });
});

describe("iniciais", () => {
  it("uma palavra vira uma letra", () => {
    assert.equal(iniciais("Strix"), "S");
  });

  it("varias palavras viram primeira + ultima", () => {
    assert.equal(iniciais("Ana Lúcia Prado"), "AP");
  });

  it("maiuscula mesmo com nome minusculo, e acento preservado", () => {
    assert.equal(iniciais("érica souza"), "ÉS");
  });

  it("vazio vira ?", () => {
    assert.equal(iniciais("   "), "?");
  });
});
