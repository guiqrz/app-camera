/** Testes de papeis.ts. Rodar com `npm test`. */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { podeAbrir, telaInicial, telasDoPapel } from "./papeis.ts";

describe("podeAbrir", () => {
  it("coordenacao nao abre telas de professor", () => {
    for (const caminho of ["/", "/aulas", "/aulas/3", "/chamada", "/chamada/9", "/relatorios/sessao/1", "/camera"]) {
      assert.equal(podeAbrir("coordenacao", caminho), false, caminho);
    }
    assert.equal(podeAbrir("coordenacao", "/coordenacao"), true);
    assert.equal(podeAbrir("coordenacao", "/coordenacao/turmas/2"), true);
    assert.equal(podeAbrir("coordenacao", "/ia/5"), true);
    assert.equal(podeAbrir("coordenacao", "/configuracoes"), true);
  });

  it("professor nao abre coordenacao", () => {
    assert.equal(podeAbrir("professor", "/coordenacao"), false);
    assert.equal(podeAbrir("professor", "/coordenacao/turmas/2"), false);
    assert.equal(podeAbrir("professor", "/aulas"), true);
    assert.equal(podeAbrir("professor", "/"), true);
  });

  it("pontes /api/* de cada lado", () => {
    assert.equal(podeAbrir("professor", "/api/coordenacao/agenda"), false);
    assert.equal(podeAbrir("professor", "/api/admin/panorama"), false);
    assert.equal(podeAbrir("coordenacao", "/api/camera/ligar"), false);
    assert.equal(podeAbrir("coordenacao", "/api/chamada/3"), false);
    // O resto o backend decide (403/404).
    assert.equal(podeAbrir("coordenacao", "/api/admin/turmas"), true);
    assert.equal(podeAbrir("professor", "/api/lembretes"), true);
  });

  it("admin abre tudo", () => {
    for (const caminho of ["/", "/coordenacao", "/camera", "/api/camera/ligar", "/api/coordenacao/agenda"]) {
      assert.equal(podeAbrir("admin", caminho), true, caminho);
    }
  });

  it("prefixo nao vaza: /coordenacaox nao e' /coordenacao", () => {
    assert.equal(podeAbrir("coordenacao", "/coordenacaox"), false);
    assert.equal(podeAbrir("professor", "/aulasx"), false);
  });

  it("papel desconhecido (cookie antigo, aluno) nao abre nada", () => {
    assert.equal(podeAbrir("aluno", "/"), false);
    assert.equal(podeAbrir("", "/coordenacao"), false);
  });
});

describe("telaInicial e telasDoPapel", () => {
  it("coordenacao cai na Coordenacao; professor e admin no Inicio", () => {
    assert.equal(telaInicial("coordenacao"), "/coordenacao");
    assert.equal(telaInicial("professor"), "/");
    assert.equal(telaInicial("admin"), "/");
  });

  it("menu de cada papel", () => {
    assert.ok(telasDoPapel("admin").includes("/camera"));
    assert.ok(telasDoPapel("admin").includes("/coordenacao"));
    assert.ok(!telasDoPapel("professor").includes("/coordenacao"));
    assert.ok(!telasDoPapel("coordenacao").includes("/aulas"));
    assert.ok(telasDoPapel("coordenacao").includes("/ia"));
  });
});
