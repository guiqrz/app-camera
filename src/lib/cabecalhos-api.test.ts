import assert from "node:assert/strict";
import { test } from "node:test";

import { cabecalhosDaApi } from "./cabecalhos-api.ts";

test("nuvem com sessao leva a chave e a sessao", () => {
  assert.deepEqual(cabecalhosDaApi("nuvem", "chave", "sess"), {
    "X-API-Key": "chave",
    "X-Sessao": "sess",
  });
});

test("sem sessao vai so' a chave (o backend responde 401)", () => {
  assert.deepEqual(cabecalhosDaApi("nuvem", "chave", undefined), { "X-API-Key": "chave" });
});

test("a sessao nunca vai pro notebook da camera", () => {
  assert.deepEqual(cabecalhosDaApi("camera", "chave-cam", "sess"), { "X-API-Key": "chave-cam" });
});
