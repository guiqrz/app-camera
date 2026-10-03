/** Testes de equipe-exibicao.ts. Rodar com `npm test`. */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { dataCurta, podeVerEquipe, prazoRestante } from "./equipe-exibicao.ts";

const AGORA = new Date("2026-09-27T10:00:00");

describe("podeVerEquipe", () => {
  it("so' admin e coordenacao", () => {
    assert.equal(podeVerEquipe("admin"), true);
    assert.equal(podeVerEquipe("coordenacao"), true);
    assert.equal(podeVerEquipe("professor"), false);
  });
});

describe("prazoRestante", () => {
  it("dias, amanha, horas e vencido", () => {
    assert.equal(prazoRestante("2026-10-04T10:00:00", AGORA), "vence em 7 dias");
    assert.equal(prazoRestante("2026-09-28T12:00:00", AGORA), "vence amanhã");
    assert.equal(prazoRestante("2026-09-27T20:00:00", AGORA), "vence em 10 horas");
    assert.equal(prazoRestante("2026-09-27T10:30:00", AGORA), "vence em menos de 1 hora");
    assert.equal(prazoRestante("2026-09-27T09:00:00", AGORA), "vencido");
  });

  it("link recem-gerado mostra o prazo cheio, e nao um a menos", () => {
    // O backend grava o prazo e a tela le alguns segundos depois: cortar pra
    // baixo mostraria "6 dias" logo abaixo de "vale por 7 dias".
    const segundosDepois = new Date("2026-09-27T10:00:05");
    assert.equal(prazoRestante("2026-10-04T10:00:00", segundosDepois), "vence em 7 dias");
    assert.equal(prazoRestante("2026-09-28T10:00:00", segundosDepois), "vence em 24 horas");
  });
});

describe("dataCurta", () => {
  it("dd/mm/aaaa sem mexer no fuso", () => {
    assert.equal(dataCurta("2026-09-27T23:59:00"), "27/09/2026");
  });
});
