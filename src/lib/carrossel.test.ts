import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { alturaDoCampo } from "./campo-que-cresce.ts";
import { estadoDasSetas } from "./carrossel.ts";

describe("setas do carrossel", () => {
  it("no comeco so' a seta da direita", () => {
    assert.deepEqual(estadoDasSetas(0, 600, 1400), { anterior: false, proxima: true });
  });
  it("no meio as duas", () => {
    assert.deepEqual(estadoDasSetas(300, 600, 1400), { anterior: true, proxima: true });
  });
  it("no fim so' a da esquerda, com folga de arredondamento", () => {
    // 1400 - 600 = 800; o navegador para em 799.4 com zoom/escala fracionaria.
    assert.deepEqual(estadoDasSetas(799.4, 600, 1400), { anterior: true, proxima: false });
  });
  it("tudo cabendo: nenhuma seta", () => {
    assert.deepEqual(estadoDasSetas(0, 600, 600), { anterior: false, proxima: false });
  });
});

describe("altura do campo que cresce", () => {
  // linha de 22.75px (text-sm + leading-relaxed), sem padding vertical.
  const base = { alturaLinha: 22.75, folga: 0, minLinhas: 2, maxLinhas: 4 };

  it("vazio ou curto fica em 2 linhas, sem rolar", () => {
    assert.deepEqual(alturaDoCampo({ ...base, alturaConteudo: 22.75 }), { altura: 45.5, rolar: false });
  });
  it("3 linhas cresce junto", () => {
    assert.deepEqual(alturaDoCampo({ ...base, alturaConteudo: 68.25 }), { altura: 68.25, rolar: false });
  });
  it("passou de 4 linhas para em 4 e passa a rolar", () => {
    assert.deepEqual(alturaDoCampo({ ...base, alturaConteudo: 140 }), { altura: 91, rolar: true });
  });
  it("exatamente 4 linhas ainda nao rola", () => {
    assert.deepEqual(alturaDoCampo({ ...base, alturaConteudo: 91 }), { altura: 91, rolar: false });
  });
});
