"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Linha, Linhas, Recado, Secao, ValorFixo } from "@/components/configuracoes/secao";
import { CampoComExemplo } from "@/components/ui/campo-com-exemplo";
import { IconSair } from "@/components/ui/icons";
import { dataCurta } from "@/lib/equipe-exibicao";
import type { MinhaConta } from "@/lib/types";
import { rotuloDoPapel } from "@/lib/usuario-exibicao";

type Estado = { tom: "neutro" | "erro"; texto: string } | null;

/** POST/PATCH JSON pra uma ponte /api/conta. Sessao expirada volta pro login. */
async function enviar(
  url: string,
  metodo: "POST" | "PATCH",
  corpo?: unknown,
): Promise<{ ok: true; dados: Record<string, unknown> } | { ok: false; erro: string }> {
  let resposta: Response;
  try {
    resposta = await fetch(url, {
      method: metodo,
      headers: corpo ? { "Content-Type": "application/json" } : undefined,
      body: corpo ? JSON.stringify(corpo) : undefined,
    });
  } catch {
    return { ok: false, erro: "Não foi possível falar com o servidor. Confira sua conexão." };
  }
  const dados = (await resposta.json().catch(() => ({}))) as Record<string, unknown>;
  if (resposta.status === 401) {
    window.location.assign("/entrar/iniciar");
    return { ok: false, erro: "Sua sessão expirou. Entre de novo." };
  }
  if (!resposta.ok) {
    return { ok: false, erro: typeof dados.erro === "string" ? dados.erro : "Não foi possível salvar." };
  }
  return { ok: true, dados };
}

/**
 * Aba "Conta" (27/09/2026): dados da conta, nome, senha e sair de todos.
 *
 * `conta` null = a API nao respondeu na hora de abrir a tela; a aba mostra
 * so' o aviso, sem formularios que falhariam ao salvar.
 */
export function PainelConta({ conta }: { conta: MinhaConta | null }) {
  if (conta === null) {
    return (
      <Secao titulo="Conta">
        <Recado tom="erro">Não foi possível carregar sua conta agora. Tente de novo em instantes.</Recado>
      </Secao>
    );
  }
  return (
    <div className="flex flex-col gap-4">
      <Secao titulo="Dados da conta">
        <Linhas>
          <Linha rotulo="Email"><ValorFixo>{conta.email}</ValorFixo></Linha>
          <Linha rotulo="Papel"><ValorFixo>{rotuloDoPapel(conta.papel)}</ValorFixo></Linha>
          <Linha rotulo="Conta criada em"><ValorFixo>{dataCurta(conta.criado_em)}</ValorFixo></Linha>
        </Linhas>
      </Secao>
      <FormNome nomeAtual={conta.nome} />
      <FormSenha />
      <SairDeTodos />
    </div>
  );
}

function FormNome({ nomeAtual }: { nomeAtual: string }) {
  const router = useRouter();
  const [nome, setNome] = useState(nomeAtual);
  const [enviando, setEnviando] = useState(false);
  const [estado, setEstado] = useState<Estado>(null);

  async function salvar(evento: FormEvent) {
    evento.preventDefault();
    setEnviando(true);
    const resultado = await enviar("/api/conta/nome", "PATCH", { nome });
    setEnviando(false);
    if (!resultado.ok) return setEstado({ tom: "erro", texto: resultado.erro });
    setNome(String(resultado.dados.nome));
    setEstado({ tom: "neutro", texto: "Nome salvo." });
    // O cookie foi regravado pela ponte; refresh faz o layout ler o nome novo.
    router.refresh();
  }

  return (
    <Secao titulo="Nome" descricao="É o nome que aparece na barra lateral.">
      <form className="cfg-form" onSubmit={salvar} noValidate>
        <CampoComExemplo
          rotulo="Nome completo"
          valor={nome}
          aoMudar={setNome}
          exemplo=""
          autoComplete="name"
          maxLength={120}
          disabled={enviando}
        />
        <div className="cfg-form-acoes">
          <button type="submit" className="btn-acao forte" disabled={enviando || nome.trim().length < 2}>
            {enviando ? "Salvando…" : "Salvar nome"}
          </button>
        </div>
        {estado && <Recado tom={estado.tom}>{estado.texto}</Recado>}
      </form>
    </Secao>
  );
}

function FormSenha() {
  const [atual, setAtual] = useState("");
  const [nova, setNova] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [estado, setEstado] = useState<Estado>(null);

  async function salvar(evento: FormEvent) {
    evento.preventDefault();
    if (nova.length < 6) return setEstado({ tom: "erro", texto: "A senha nova precisa ter pelo menos 6 caracteres." });
    if (nova !== confirmar) return setEstado({ tom: "erro", texto: "As senhas não são iguais." });
    setEnviando(true);
    const resultado = await enviar("/api/conta/senha", "POST", { senhaAtual: atual, senhaNova: nova });
    setEnviando(false);
    if (!resultado.ok) return setEstado({ tom: "erro", texto: resultado.erro });
    setAtual("");
    setNova("");
    setConfirmar("");
    setEstado({ tom: "neutro", texto: "Senha trocada. Os outros aparelhos foram desconectados." });
  }

  return (
    <Secao titulo="Senha" descricao="Ao trocar, os outros aparelhos saem da sua conta. Este continua.">
      <form className="cfg-form" onSubmit={salvar} noValidate>
        <CampoComExemplo rotulo="Senha atual" type="password" autoComplete="current-password"
          valor={atual} aoMudar={setAtual} exemplo="" disabled={enviando} />
        <CampoComExemplo rotulo="Senha nova" type="password" autoComplete="new-password"
          valor={nova} aoMudar={setNova} exemplo="" disabled={enviando} />
        <CampoComExemplo rotulo="Confirmar senha nova" type="password" autoComplete="new-password"
          valor={confirmar} aoMudar={setConfirmar} exemplo="" disabled={enviando} />
        <div className="cfg-form-acoes">
          <button type="submit" className="btn-acao forte" disabled={enviando || !atual || !nova}>
            {enviando ? "Trocando…" : "Trocar senha"}
          </button>
        </div>
        {estado && <Recado tom={estado.tom}>{estado.texto}</Recado>}
      </form>
    </Secao>
  );
}

/**
 * Confirmacao em DOIS cliques no proprio botao, e nao window.confirm: dialogo
 * nativo nao segue o tema e trava a aba inteira.
 */
function SairDeTodos() {
  const [confirmando, setConfirmando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function sair() {
    if (!confirmando) return setConfirmando(true);
    setEnviando(true);
    const resultado = await enviar("/api/conta/sair-de-todos", "POST");
    if (!resultado.ok) {
      setEnviando(false);
      setConfirmando(false);
      return setErro(resultado.erro);
    }
    window.location.assign(String(resultado.dados.destino ?? "/entrar/iniciar"));
  }

  return (
    <Secao titulo="Sair de todos os aparelhos" descricao="Encerra sua conta em todo lugar, inclusive aqui. Use se você entrou num computador que não é seu.">
      <div className="cfg-form">
        <div className="cfg-form-acoes">
          <button type="button" className="btn-acao vidro" onClick={sair} disabled={enviando}>
            <IconSair size={16} />
            {confirmando ? "Confirmar: sair de todos" : "Sair de todos os aparelhos"}
          </button>
          {confirmando && !enviando && (
            <button type="button" className="btn-acao" onClick={() => setConfirmando(false)}>
              Cancelar
            </button>
          )}
        </div>
        {erro && <Recado tom="erro">{erro}</Recado>}
      </div>
    </Secao>
  );
}
