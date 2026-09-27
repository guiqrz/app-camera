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
  verificarSessaoAssinada,
} from "./sessao-assinada.ts";

const SEGREDO = "segredo-de-teste-com-tamanho-suficiente-000";
const OUTRO_SEGREDO = "outro-segredo-de-teste-com-tamanho-suficiente";

describe("assinarSessao + verificarSessaoAssinada", () => {
  it("aceita o valor que ele mesmo assinou", async () => {
    const valor = await assinarSessao("abc_DEF-123", 1_790_000_000, SEGREDO);
    assert.match(valor, /^abc_DEF-123\.1790000000\.[A-Za-z0-9_-]{43}$/);

    const lida = await verificarSessaoAssinada(valor, SEGREDO);
    assert.deepEqual(lida, { sessao: "abc_DEF-123", validadoEm: 1_790_000_000 });
  });

  it("aceita sessao que contem ponto (parse pela direita)", async () => {
    const valor = await assinarSessao("a.b.c", 10, SEGREDO);
    assert.deepEqual(await verificarSessaoAssinada(valor, SEGREDO), {
      sessao: "a.b.c",
      validadoEm: 10,
    });
  });

  it("recusa sessao trocada mantendo a assinatura", async () => {
    const valor = await assinarSessao("sessao-real", 100, SEGREDO);
    const adulterado = valor.replace("sessao-real", "sessao-alheia");
    assert.equal(await verificarSessaoAssinada(adulterado, SEGREDO), null);
  });

  it("recusa validadoEm adiantado pra fugir da revalidacao", async () => {
    const valor = await assinarSessao("s", 100, SEGREDO);
    const adulterado = valor.replace(".100.", ".999999.");
    assert.equal(await verificarSessaoAssinada(adulterado, SEGREDO), null);
  });

  it("recusa assinatura com um caractere trocado", async () => {
    const valor = await assinarSessao("s", 100, SEGREDO);
    const ultimo = valor.at(-1);
    const adulterado = valor.slice(0, -1) + (ultimo === "A" ? "B" : "A");
    assert.equal(await verificarSessaoAssinada(adulterado, SEGREDO), null);
  });

  it("recusa valor assinado com outro segredo", async () => {
    const valor = await assinarSessao("s", 100, OUTRO_SEGREDO);
    assert.equal(await verificarSessaoAssinada(valor, SEGREDO), null);
  });

  it("recusa formatos quebrados sem lancar", async () => {
    const valida = await assinarSessao("s", 100, SEGREDO);
    const assinatura = valida.split(".").at(-1)!;
    const quebrados = [
      "",
      "inventado",
      "sessao.123",
      `.100.${assinatura}`, // sessao vazia
      `s..${assinatura}`, // validadoEm vazio
      `s.-1.${assinatura}`, // validadoEm negativo
      `s.1e3.${assinatura}`, // validadoEm em notacao cientifica
      `s.100.`, // assinatura vazia
      `s.100.${assinatura}x`, // assinatura comprida demais
      `s.100.${assinatura.slice(0, -1)}+`, // caractere fora do base64url
    ];
    for (const valor of quebrados) {
      assert.equal(await verificarSessaoAssinada(valor, SEGREDO), null, valor);
    }
  });

  it("nunca assina com segredo vazio", async () => {
    await assert.rejects(assinarSessao("s", 1, ""));
    await assert.rejects(verificarSessaoAssinada("s.1.x", ""));
  });

  it("recusa assinar entrada invalida", async () => {
    await assert.rejects(assinarSessao("", 1, SEGREDO));
    await assert.rejects(assinarSessao("s", -1, SEGREDO));
    await assert.rejects(assinarSessao("s", 1.5, SEGREDO));
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
