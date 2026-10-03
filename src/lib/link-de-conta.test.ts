/** Testes de link-de-conta.ts. Rodar com `npm test`. */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  eTipoDeLink,
  estadoDaLeituraPorStatus,
  estadoDoEnvioPorStatus,
  MENSAGEM_LINK_INVALIDO,
  MENSAGEM_POR_ESTADO,
  origemDoProprioApp,
  validarFormularioDeLink,
} from "./link-de-conta.ts";

describe("eTipoDeLink", () => {
  it("aceita so' os dois tipos", () => {
    assert.equal(eTipoDeLink("convite"), true);
    assert.equal(eTipoDeLink("nova_senha"), true);
    assert.equal(eTipoDeLink("nova-senha"), false);
    assert.equal(eTipoDeLink(undefined), false);
  });
});

describe("estado por status", () => {
  it("API dormindo vira ligando (0 = rede/timeout)", () => {
    for (const status of [0, 502, 503, 504]) {
      assert.equal(estadoDaLeituraPorStatus(status), "ligando");
      assert.equal(estadoDoEnvioPorStatus(status), "ligando");
    }
  });

  it("traduz os codigos da API", () => {
    assert.equal(estadoDaLeituraPorStatus(404), "invalido");
    assert.equal(estadoDaLeituraPorStatus(429), "bloqueado");
    assert.equal(estadoDaLeituraPorStatus(500), "erro");
    assert.equal(estadoDaLeituraPorStatus(401), "erro");
    assert.equal(estadoDoEnvioPorStatus(404), "invalido");
    assert.equal(estadoDoEnvioPorStatus(409), "duplicado");
    assert.equal(estadoDoEnvioPorStatus(422), "dados");
    assert.equal(estadoDoEnvioPorStatus(429), "bloqueado");
    assert.equal(estadoDoEnvioPorStatus(500), "erro");
  });
});

describe("origemDoProprioApp", () => {
  const url = "https://cupcam-app.vercel.app/entrar/link";

  it("aceita so' a origem do proprio app", () => {
    assert.equal(origemDoProprioApp("https://cupcam-app.vercel.app", url), true);
    assert.equal(origemDoProprioApp("https://malicioso.test", url), false);
    assert.equal(origemDoProprioApp("http://cupcam-app.vercel.app", url), false);
  });

  it("recusa sem Origin: navegador sempre manda em POST de fetch", () => {
    assert.equal(origemDoProprioApp(null, url), false);
    assert.equal(origemDoProprioApp("null", url), false);
  });
});

describe("validarFormularioDeLink", () => {
  it("convite exige nome e senha de 6+", () => {
    const erro = validarFormularioDeLink({ tipo: "convite", nome: " A ", senha: "123", confirmar: "123" });
    assert.deepEqual(erro, {
      mensagem: "Preencha o nome e uma senha com pelo menos 6 caracteres.",
      campos: ["nome", "senha"],
    });
  });

  it("nova senha ignora o nome", () => {
    assert.equal(
      validarFormularioDeLink({ tipo: "nova_senha", nome: "", senha: "senha-nova", confirmar: "senha-nova" }),
      null,
    );
    assert.deepEqual(
      validarFormularioDeLink({ tipo: "nova_senha", nome: "", senha: "123", confirmar: "123" }),
      { mensagem: "A senha precisa ter pelo menos 6 caracteres.", campos: ["senha"] },
    );
  });

  it("senhas diferentes acusam o confirmar", () => {
    assert.deepEqual(
      validarFormularioDeLink({ tipo: "convite", nome: "Ana", senha: "senha-nova", confirmar: "senha-novx" }),
      { mensagem: "As senhas não são iguais.", campos: ["confirmar"] },
    );
  });

  it("tudo certo devolve null", () => {
    assert.equal(
      validarFormularioDeLink({ tipo: "convite", nome: "Ana Prado", senha: "senha-nova", confirmar: "senha-nova" }),
      null,
    );
  });
});

describe("mensagens", () => {
  it("usa as frases exatas da spec", () => {
    assert.equal(MENSAGEM_LINK_INVALIDO, "Este link não vale mais. Peça um novo à coordenação.");
    assert.equal(MENSAGEM_POR_ESTADO.invalido, MENSAGEM_LINK_INVALIDO);
    assert.equal(MENSAGEM_POR_ESTADO.duplicado, "Já existe uma conta com esse email.");
    assert.equal(
      MENSAGEM_POR_ESTADO.erro,
      "O servidor está com problema agora. Tente de novo em instantes.",
    );
  });
});
