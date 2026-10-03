"use client";

import { useCallback, useState, type FormEvent } from "react";

import { Linha, Linhas, Pilula, Recado, Secao, ValorFixo } from "@/components/configuracoes/secao";
import { CampoComExemplo } from "@/components/ui/campo-com-exemplo";
import { IconCopiar, IconMais } from "@/components/ui/icons";
import { prazoRestante } from "@/lib/equipe-exibicao";
import type { Equipe, PessoaDaEquipe } from "@/lib/types";
import { nomeDeExibicao, rotuloDoPapel } from "@/lib/usuario-exibicao";

type LinkMostrado = { titulo: string; link: string; expiraEm: string } | null;

async function chamar(url: string, metodo: "GET" | "POST" | "DELETE", corpo?: unknown) {
  let resposta: Response;
  try {
    resposta = await fetch(url, {
      method: metodo,
      headers: corpo ? { "Content-Type": "application/json" } : undefined,
      body: corpo ? JSON.stringify(corpo) : undefined,
      cache: "no-store",
    });
  } catch {
    return { ok: false as const, erro: "Não foi possível falar com o servidor. Confira sua conexão." };
  }
  if (resposta.status === 401) {
    window.location.assign("/entrar/iniciar");
    return { ok: false as const, erro: "Sua sessão expirou." };
  }
  const dados = (resposta.status === 204 ? {} : await resposta.json().catch(() => ({}))) as Record<string, unknown>;
  if (!resposta.ok) {
    return { ok: false as const, erro: typeof dados.erro === "string" ? dados.erro : "Não foi possível concluir." };
  }
  return { ok: true as const, dados };
}

/**
 * Aba "Equipe" (27/09/2026): convidar, links de nova senha, desativar.
 *
 * Os botoes de cada pessoa vem de `pessoa.pode`, calculado pelo BACKEND pra
 * quem esta logado -- a tela nao reimplementa a regra. E a rota da acao
 * confere de novo: esconder aqui e' conforto, nao seguranca.
 */
export function PainelEquipe({ equipeInicial }: { equipeInicial: Equipe | null }) {
  const [equipe, setEquipe] = useState(equipeInicial);
  const [linkMostrado, setLinkMostrado] = useState<LinkMostrado>(null);
  const [erro, setErro] = useState<string | null>(null);

  const recarregar = useCallback(async () => {
    const resultado = await chamar("/api/conta/equipe", "GET");
    if (resultado.ok) setEquipe(resultado.dados as unknown as Equipe);
    else setErro(resultado.erro);
  }, []);

  if (equipe === null) {
    return (
      <Secao titulo="Equipe">
        <Recado tom="erro">Não foi possível carregar a equipe agora. Tente de novo em instantes.</Recado>
      </Secao>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <FormConvite
        papeis={equipe.papeis_convidaveis}
        aoGerar={(link, expiraEm) => {
          setLinkMostrado({ titulo: "Link do convite", link, expiraEm });
          void recarregar();
        }}
      />
      {linkMostrado && <LinkGeradoBox {...linkMostrado} aoFechar={() => setLinkMostrado(null)} />}
      {erro && <Recado tom="erro">{erro}</Recado>}

      <Secao titulo="Pessoas">
        <Linhas>
          {equipe.pessoas.map((pessoa) => (
            <LinhaPessoa
              key={pessoa.id}
              pessoa={pessoa}
              aoMudar={recarregar}
              aoGerarLink={(link, expiraEm) =>
                setLinkMostrado({ titulo: `Link de nova senha: ${nomeDeExibicao(pessoa.nome, pessoa.email)}`, link, expiraEm })
              }
              aoErro={setErro}
            />
          ))}
        </Linhas>
      </Secao>

      <Secao titulo="Convites pendentes" descricao="Links ainda não usados. Cancelar invalida o link na hora.">
        {equipe.convites_pendentes.length === 0 ? (
          <Recado>Nenhum convite pendente.</Recado>
        ) : (
          <Linhas>
            {equipe.convites_pendentes.map((convite) => (
              <Linha key={convite.id} rotulo={convite.email}
                apoio={`${rotuloDoPapel(convite.papel)} · ${prazoRestante(convite.expira_em, new Date())}`}>
                <button type="button" className="btn-acao"
                  onClick={async () => {
                    const resultado = await chamar(`/api/conta/convites/${convite.id}`, "DELETE");
                    if (!resultado.ok) setErro(resultado.erro);
                    await recarregar();
                  }}>
                  Cancelar
                </button>
              </Linha>
            ))}
          </Linhas>
        )}
      </Secao>
    </div>
  );
}

function FormConvite({ papeis, aoGerar }: { papeis: string[]; aoGerar: (link: string, expiraEm: string) => void }) {
  const [email, setEmail] = useState("");
  const [papel, setPapel] = useState(papeis.includes("professor") ? "professor" : (papeis[0] ?? ""));
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function gerar(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);
    setEnviando(true);
    const resultado = await chamar("/api/conta/convites", "POST", { email, papel });
    setEnviando(false);
    if (!resultado.ok) return setErro(resultado.erro);
    setEmail("");
    aoGerar(String(resultado.dados.link), String(resultado.dados.expiraEm));
  }

  return (
    <Secao titulo="Convidar" descricao="Gera um link de uso único que vale por 7 dias. Mande pela conversa que você já usa com a pessoa.">
      <form className="cfg-form" onSubmit={gerar} noValidate>
        <CampoComExemplo rotulo="Email da pessoa" type="email" autoComplete="off"
          valor={email} aoMudar={setEmail} exemplo="" disabled={enviando} />
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-text-muted text-xs font-semibold">Papel</span>
          <select className="cfg-select" value={papel} onChange={(e) => setPapel(e.target.value)} disabled={enviando}>
            {papeis.map((opcao) => (
              <option key={opcao} value={opcao}>{rotuloDoPapel(opcao)}</option>
            ))}
          </select>
        </label>
        <div className="cfg-form-acoes">
          <button type="submit" className="btn-acao forte" disabled={enviando || !email.includes("@")}>
            <IconMais size={16} />
            {enviando ? "Gerando…" : "Gerar link"}
          </button>
        </div>
        {erro && <Recado tom="erro">{erro}</Recado>}
      </form>
    </Secao>
  );
}

function LinkGeradoBox({ titulo, link, expiraEm, aoFechar }: NonNullable<LinkMostrado> & { aoFechar: () => void }) {
  const [copiado, setCopiado] = useState(false);
  return (
    <Secao titulo={titulo} descricao={`Copie agora: ele não aparece de novo. ${prazoRestante(expiraEm, new Date())}.`}>
      <div className="cfg-form">
        <div className="cfg-link-gerado">
          <ValorFixo><code>{link}</code></ValorFixo>
          <button type="button" className="btn-acao forte"
            onClick={async () => {
              await navigator.clipboard.writeText(link).catch(() => undefined);
              setCopiado(true);
            }}>
            <IconCopiar size={16} />
            {copiado ? "Copiado" : "Copiar"}
          </button>
          <button type="button" className="btn-acao" onClick={aoFechar}>Fechar</button>
        </div>
        <span className="sr-only" role="status">{copiado ? "Link copiado." : ""}</span>
      </div>
    </Secao>
  );
}

function LinhaPessoa({
  pessoa, aoMudar, aoGerarLink, aoErro,
}: {
  pessoa: PessoaDaEquipe;
  aoMudar: () => Promise<void>;
  aoGerarLink: (link: string, expiraEm: string) => void;
  aoErro: (erro: string) => void;
}) {
  const [confirmandoDesativar, setConfirmandoDesativar] = useState(false);
  const [enviando, setEnviando] = useState(false);

  async function acao(nome: "nova-senha" | "desativar" | "reativar") {
    setEnviando(true);
    const resultado = await chamar(`/api/conta/usuarios/${pessoa.id}/${nome}`, "POST");
    setEnviando(false);
    setConfirmandoDesativar(false);
    if (!resultado.ok) return aoErro(resultado.erro);
    if (nome === "nova-senha") aoGerarLink(String(resultado.dados.link), String(resultado.dados.expiraEm));
    else await aoMudar();
  }

  return (
    <Linha rotulo={nomeDeExibicao(pessoa.nome, pessoa.email)} apoio={`${pessoa.email} · ${rotuloDoPapel(pessoa.papel)}`}>
      <div className="cfg-pessoa-acoes">
        <Pilula tom={pessoa.ativo ? "ok" : "neutro"}>{pessoa.ativo ? "Ativa" : "Desativada"}</Pilula>
        {pessoa.pode.nova_senha && pessoa.ativo && (
          <button type="button" className="btn-acao" disabled={enviando} onClick={() => acao("nova-senha")}>
            Link de nova senha
          </button>
        )}
        {pessoa.pode.desativar && pessoa.ativo && (
          <button type="button" className="btn-acao" disabled={enviando}
            onClick={() => (confirmandoDesativar ? acao("desativar") : setConfirmandoDesativar(true))}>
            {confirmandoDesativar ? "Confirmar: desativar" : "Desativar"}
          </button>
        )}
        {pessoa.pode.reativar && !pessoa.ativo && (
          <button type="button" className="btn-acao" disabled={enviando} onClick={() => acao("reativar")}>
            Reativar
          </button>
        )}
      </div>
    </Linha>
  );
}
