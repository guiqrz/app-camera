/** Testes de baixar-arquivo.ts. Rodar com `npm test`. */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { nomeDoArquivoDoCabecalho } from "./baixar-arquivo.ts";

describe("nomeDoArquivoDoCabecalho", () => {
  it("le' o nome entre aspas do Content-Disposition", () => {
    assert.equal(
      nomeDoArquivoDoCabecalho(
        'attachment; filename="exercicios-2026-09-29-lista-Probabilidade.pdf"',
        "lista.pdf",
      ),
      "exercicios-2026-09-29-lista-Probabilidade.pdf",
    );
  });

  it("sem cabecalho ou sem filename, usa o padrao", () => {
    assert.equal(nomeDoArquivoDoCabecalho(null, "lista.pdf"), "lista.pdf");
    assert.equal(nomeDoArquivoDoCabecalho("attachment", "lista.pdf"), "lista.pdf");
  });
});
