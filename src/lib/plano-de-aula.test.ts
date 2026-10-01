import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  dataCurta,
  minutosTotais,
  ROTULO_DA_BASE,
  urlDoArquivoDoPlano,
  urlDoArquivoDoRoteiro,
} from "./plano-de-aula.ts";

describe("plano de aula", () => {
  it("url do arquivo", () => {
    assert.equal(urlDoArquivoDoPlano(7, "docx"), "/api/ia/planos/7/arquivo?formato=docx");
  });
  it("url do arquivo do roteiro", () => {
    assert.equal(urlDoArquivoDoRoteiro(7, "pdf"), "/api/ia/planos/7/roteiro/arquivo?formato=pdf");
  });
  it("soma so' os minutos validos", () => {
    const plano = { campos: { metodologia: [
      { etapa: "A", minutos: 10, descricao: "" },
      { etapa: "B", minutos: null, descricao: "" },
      { etapa: "C", minutos: 25, descricao: "" },
    ] } };
    assert.equal(minutosTotais(plano as never), 35);
  });
  it("data curta em portugues e sem data", () => {
    assert.equal(dataCurta("2026-10-06"), "ter, 06/10");
    assert.equal(dataCurta(null), "sem data");
  });
  it("rotulos iguais aos do backend", () => {
    assert.deepEqual(ROTULO_DA_BASE, {
      onde_parou: "Onde a turma parou",
      engajamento: "Engajamento da turma",
      transcricao: "Suas últimas aulas",
    });
  });
});
