"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";

import { CampoSenha } from "@/components/auth/campo-senha";
import {
  MENSAGEM_LINK_INVALIDO,
  MENSAGEM_POR_ESTADO,
  validarFormularioDeLink,
  type EstadoDaLeitura,
  type EstadoDoEnvio,
  type TipoDeLink,
} from "@/lib/link-de-conta";

/**
 * Formulario das paginas de link, com a marcacao do criar-conta.html do
 * Strix (classes .form-auth, .campo, .botao-auth) pro CSS portado casar.
 *
 * Ao abrir, le o link pela ponte /entrar/link — em sequencia, nunca em
 * paralelo, enquanto a API estiver ligando (ate' 90 s, o teto do login). So'
 * entao libera o envio: link morto nao merece formulario.
 *
 * Erros aparecem numa caixa .auth-erro logo ANTES do botao, com os campos
 * culpados em aria-invalid — o mesmo desenho do login do Strix.
 */

const TETO_DE_ESPERA_MS = 90_000;
const INTERVALO_ENTRE_TENTATIVAS_MS = 2_000;
/** Antes disto a espera e' normal e nao merece aviso. */
const MOSTRAR_ESPERA_APOS_S = 3;
const ID_ERRO = "auth-erro";

type CampoInvalido = "nome" | "senha" | "confirmar";

type Props = { tipo: TipoDeLink; token: string };

export function FormularioDeLink({ tipo, token }: Props) {
  const [leitura, setLeitura] = useState<EstadoDaLeitura>("ligando");
  const [segundos, setSegundos] = useState(0);
  const [email, setEmail] = useState("");
  const [nome, setNome] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<{ mensagem: string; campos: CampoInvalido[] } | null>(null);
  const [linkMorto, setLinkMorto] = useState(false);
  const enviandoRef = useRef(false);

  // Leitura do link, com espera silenciosa enquanto a API acorda.
  useEffect(() => {
    let cancelado = false;
    const inicio = Date.now();
    const relogio = window.setInterval(() => {
      setSegundos(Math.floor((Date.now() - inicio) / 1000));
    }, 1000);

    async function ler() {
      for (;;) {
        const resposta = await postarJson<RespostaDaLeitura>(
          "/entrar/link",
          { token, tipo },
          { estado: "erro" },
        );
        if (cancelado) return;
        const estado: EstadoDaLeitura = resposta?.estado ?? "ligando";
        const venceu = Date.now() - inicio >= TETO_DE_ESPERA_MS;
        if (estado !== "ligando" || venceu) {
          window.clearInterval(relogio);
          if (estado === "pronto" && typeof resposta?.email === "string") {
            setEmail(resposta.email);
            setLeitura("pronto");
          } else {
            setLeitura(estado === "ligando" ? "erro" : estado);
            if (estado === "invalido") setLinkMorto(true);
          }
          return;
        }
        await esperar(INTERVALO_ENTRE_TENTATIVAS_MS);
        if (cancelado) return;
      }
    }

    void ler();
    return () => {
      cancelado = true;
      window.clearInterval(relogio);
    };
  }, [token, tipo]);

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    // Trava de clique duplo: o estado do React so' muda no proximo render.
    if (enviandoRef.current || leitura !== "pronto") return;

    const invalido = validarFormularioDeLink({ tipo, nome, senha, confirmar });
    if (invalido) {
      setErro(invalido);
      document.getElementById(invalido.campos[0])?.focus();
      return;
    }

    setErro(null);
    enviandoRef.current = true;
    setEnviando(true);

    const inicio = Date.now();
    for (;;) {
      const resposta = await postarJson<RespostaDoEnvio>(
        "/entrar/link/salvar",
        { token, tipo, nome, senha },
        { estado: "erro" },
      );
      const estado: EstadoDoEnvio = resposta?.estado ?? "ligando";
      if (estado === "pronto") {
        // Botao continua travado enquanto a navegacao acontece.
        window.location.assign("/");
        return;
      }
      if (estado !== "ligando" || Date.now() - inicio >= TETO_DE_ESPERA_MS) {
        enviandoRef.current = false;
        setEnviando(false);
        if (estado === "invalido") {
          setLinkMorto(true);
          return;
        }
        const final = estado === "ligando" ? "erro" : estado;
        setErro({
          mensagem: MENSAGEM_POR_ESTADO[final],
          campos: final === "dados" ? (tipo === "convite" ? ["nome", "senha"] : ["senha"]) : [],
        });
        return;
      }
      await esperar(INTERVALO_ENTRE_TENTATIVAS_MS);
    }
  }

  if (linkMorto) {
    return (
      <p className="auth-aviso-link" role="alert">
        {MENSAGEM_LINK_INVALIDO}
      </p>
    );
  }

  const invalido = (campo: CampoInvalido) => erro?.campos.includes(campo) ?? false;
  const textoDoBotao = tipo === "convite" ? "Criar Conta" : "Salvar nova senha";
  const lendo = leitura === "ligando";
  const falhouLeitura = leitura === "erro" || leitura === "bloqueado";

  return (
    <form className="form-auth" noValidate onSubmit={enviar} aria-busy={lendo || enviando}>
      {lendo && segundos >= MOSTRAR_ESPERA_APOS_S ? (
        <p className="auth-aviso-link" role="status">
          Ligando o servidor… {segundos} s
        </p>
      ) : null}

      {tipo === "convite" ? (
        <div className="campo">
          <label htmlFor="nome">Nome Completo</label>
          <input
            type="text"
            id="nome"
            name="nome"
            autoComplete="name"
            maxLength={120}
            placeholder="Ana Lúcia Prado"
            value={nome}
            onChange={(evento) => setNome(evento.target.value)}
            aria-invalid={invalido("nome") || undefined}
            aria-describedby={invalido("nome") ? ID_ERRO : undefined}
            autoFocus
          />
        </div>
      ) : null}

      <div className="campo">
        <label htmlFor="email">Email</label>
        <input
          type="email"
          id="email"
          name="email"
          autoComplete="email"
          readOnly
          aria-readonly="true"
          value={email}
          placeholder={lendo ? "Conferindo o link…" : ""}
        />
      </div>

      <CampoSenha
        id="senha"
        rotulo={tipo === "convite" ? "Senha" : "Nova senha"}
        valor={senha}
        aoMudar={setSenha}
        invalido={invalido("senha")}
        descritoPor={ID_ERRO}
        autoFocus={tipo === "nova_senha"}
      />

      <CampoSenha
        id="confirmar"
        rotulo="Confirmar senha"
        valor={confirmar}
        aoMudar={setConfirmar}
        invalido={invalido("confirmar")}
        descritoPor={ID_ERRO}
      />

      {erro || falhouLeitura ? (
        <p id={ID_ERRO} className="auth-erro" role="alert">
          {erro?.mensagem ??
            (leitura === "bloqueado" ? MENSAGEM_POR_ESTADO.bloqueado : MENSAGEM_POR_ESTADO.erro)}
        </p>
      ) : null}

      <button
        type="submit"
        className={`botao-auth${enviando ? " carregando" : ""}`}
        disabled={leitura !== "pronto" || enviando}
        aria-label={enviando ? "Salvando" : undefined}
      >
        {enviando ? <span className="botao-spinner" aria-hidden="true" /> : textoDoBotao}
      </button>
    </form>
  );
}

type RespostaDaLeitura = { estado: EstadoDaLeitura; email?: string };
type RespostaDoEnvio = { estado: EstadoDoEnvio };

/**
 * POST JSON pras pontes. Falha de rede vira null (a tela trata como
 * "ligando" e tenta de novo); resposta nao-200 (403 de origem, 400 de corpo)
 * vira `seRecusar` -- nao adianta repetir.
 */
async function postarJson<T extends { estado: string }>(
  url: string,
  corpo: Record<string, unknown>,
  seRecusar: T,
): Promise<T | null> {
  try {
    const resposta = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(corpo),
      cache: "no-store",
    });
    if (!resposta.ok) return seRecusar;
    return (await resposta.json()) as T;
  } catch {
    return null;
  }
}

function esperar(ms: number): Promise<void> {
  return new Promise((resolver) => window.setTimeout(resolver, ms));
}
