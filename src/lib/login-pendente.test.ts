/**
 * Testes das credenciais cifradas do login pendente. `npm test`.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  cifrarLoginPendente,
  decifrarLoginPendente,
  type LoginPendente,
} from "./login-pendente.ts";

const SEGREDO = "segredo-de-teste-com-tamanho-suficiente-000";
const AGORA = 1_790_000_000;

function pendente(extra: Partial<LoginPendente> = {}): LoginPendente {
  return {
    email: "prof@escola.com",
    senha: "senha com acento é ç",
    state: "state-de-teste",
    expiraEm: AGORA + 120,
    ...extra,
  };
}

describe("login pendente", () => {
  it("ida e volta devolve o mesmo conteudo", async () => {
    const valor = await cifrarLoginPendente(pendente(), SEGREDO);
    assert.deepEqual(await decifrarLoginPendente(valor, SEGREDO, AGORA), pendente());
  });

  it("a senha nao aparece no valor do cookie", async () => {
    const valor = await cifrarLoginPendente(pendente({ senha: "minhasenha" }), SEGREDO);
    const bruto = Buffer.from(valor, "base64url").toString("latin1");
    assert.ok(!bruto.includes("minhasenha"));
    assert.ok(!valor.includes("minhasenha"));
  });

  it("dois cifrados do mesmo conteudo sao diferentes (IV aleatorio)", async () => {
    const a = await cifrarLoginPendente(pendente(), SEGREDO);
    const b = await cifrarLoginPendente(pendente(), SEGREDO);
    assert.notEqual(a, b);
  });

  it("recusa depois do prazo", async () => {
    const valor = await cifrarLoginPendente(pendente(), SEGREDO);
    assert.equal(await decifrarLoginPendente(valor, SEGREDO, AGORA + 120), null);
  });

  it("recusa outro segredo", async () => {
    const valor = await cifrarLoginPendente(pendente(), SEGREDO);
    assert.equal(
      await decifrarLoginPendente(valor, "outro-segredo-com-tamanho-suficiente-111", AGORA),
      null,
    );
  });

  it("recusa qualquer byte alterado", async () => {
    const valor = await cifrarLoginPendente(pendente(), SEGREDO);
    const bytes = Buffer.from(valor, "base64url");
    bytes[bytes.length - 1] ^= 1;
    assert.equal(
      await decifrarLoginPendente(bytes.toString("base64url"), SEGREDO, AGORA),
      null,
    );
  });

  it("recusa lixo sem lancar", async () => {
    for (const lixo of ["", "abc", "nao base64!", "A".repeat(40)]) {
      assert.equal(await decifrarLoginPendente(lixo, SEGREDO, AGORA), null);
    }
  });
});
