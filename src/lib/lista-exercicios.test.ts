/** Testes de lista-exercicios.ts. Rodar com `npm test`. */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { rotuloDaContagem, semQuestao, urlDoArquivo } from "./lista-exercicios.ts";

describe("semQuestao", () => {
  it("tira so' o id pedido e mantem a ordem", () => {
    assert.deepEqual(semQuestao([5, 9, 2, 7], 2), [5, 9, 7]);
  });

  it("id que nao esta na lista nao mexe em nada", () => {
    assert.deepEqual(semQuestao([5, 9], 3), [5, 9]);
  });

  it("tirar a ultima deixa a lista vazia", () => {
    assert.deepEqual(semQuestao([4], 4), []);
  });
});

describe("urlDoArquivo", () => {
  it("monta a rota da ponte com formato e parte", () => {
    assert.equal(
      urlDoArquivo(3, "docx", "gabarito"),
      "/api/ia/listas/3/arquivo?formato=docx&parte=gabarito",
    );
    assert.equal(
      urlDoArquivo(12, "pdf", "lista"),
      "/api/ia/listas/12/arquivo?formato=pdf&parte=lista",
    );
  });
});

describe("rotuloDaContagem", () => {
  it("fala a quantidade em portugues", () => {
    assert.equal(rotuloDaContagem(0), "Nenhuma questão");
    assert.equal(rotuloDaContagem(1), "1 questão");
    assert.equal(rotuloDaContagem(10), "10 questões");
  });
});
