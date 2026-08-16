"use client";

import { useMemo, useState } from "react";

import { AvatarAluno } from "@/components/chamada/avatar-aluno";
import { BotaoIcone } from "@/components/ui/botao-icone";
import { IconBusca, IconLapis, IconLixeira, IconMais, IconPessoas } from "@/components/ui/icons";
import type { AlunoAdmin, TurmaAdmin } from "@/lib/types";

type PainelAlunosProps = {
  /** Turma selecionada no painel esquerdo. Nulo quando nao ha turma nenhuma. */
  turma: TurmaAdmin | null;
  /** Alunos ja filtrados pela turma selecionada (a vista faz esse recorte). */
  alunos: AlunoAdmin[];
  /** Contador que a vista incrementa a cada recarga — fura o cache da miniatura. */
  versaoFotos: number;
  aoNovoAluno: () => void;
  /** Abre o modal de edicao do aluno (nome/turma/foto) na vista. */
  aoEditar: (aluno: AlunoAdmin) => void;
  aoExcluir: (aluno: AlunoAdmin) => void;
};

/**
 * Painel direito da tela Administracao: cabecalho da turma, busca e a lista
 * de alunos matriculados.
 *
 * Componente burro: a vista decide qual turma esta selecionada e passa so'
 * os alunos dela; aqui so' filtramos por nome/RA no cliente. A turma de um
 * aluno agora muda pelo modal de edicao (o antigo select inline saiu), entao
 * cada linha so' exibe o aluno e oferece editar/excluir.
 */
export function PainelAlunos({
  turma,
  alunos,
  versaoFotos,
  aoNovoAluno,
  aoEditar,
  aoExcluir,
}: PainelAlunosProps) {
  const [busca, setBusca] = useState("");

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return alunos;
    return alunos.filter(
      (aluno) =>
        aluno.nome.toLowerCase().includes(termo) ||
        aluno.ra.toLowerCase().includes(termo),
    );
  }, [alunos, busca]);

  return (
    <section className="coord-painel">
      {/* Cabecalho: nome da turma, contagem, busca e acao de adicionar. */}
      <div className="coord-painel-topo alunos-topo">
        <div className="min-w-0">
          <h2 className="coord-painel-titulo">{turma ? turma.nome : "Alunos"}</h2>
          <p className="alunos-conta">
            {turma
              ? `${alunos.length} ${alunos.length === 1 ? "aluno matriculado" : "alunos matriculados"}`
              : "Selecione uma turma para ver os alunos"}
          </p>
        </div>

        <div className="alunos-acoes">
          {/* `.busca` global (o mesmo campo do Cup AI e da Chamada) em vez de
              um desenho proprio: era a unica busca do app com raio e paddings
              diferentes de todas as outras. */}
          <label className="busca alunos-busca">
            <IconBusca size={13} />
            <span className="sr-only">Buscar aluno por nome ou RA</span>
            <input
              value={busca}
              onChange={(evento) => setBusca(evento.target.value)}
              placeholder="Buscar por nome ou RA…"
              type="search"
              autoComplete="off"
              disabled={!turma}
            />
          </label>

          {/* Vidro, nao tinta chapada: sobre o painel de vidro o `--primary`
              cheio virava um retangulo lilas claro cravado no cabecalho (ele
              apontou em 16/08). */}
          <button
            type="button"
            onClick={aoNovoAluno}
            disabled={!turma}
            className="btn-acao vidro centrado"
          >
            <IconMais size={14} />
            Adicionar aluno
          </button>
        </div>
      </div>

      {/* Corpo: estados vazios ou a lista. */}
      {!turma ? (
        <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
          <span className="text-text-muted" aria-hidden>
            <IconPessoas size={28} />
          </span>
          <p className="text-text text-sm font-semibold">Nenhuma turma cadastrada ainda.</p>
          <p className="text-text-muted text-xs">
            Crie uma turma para começar a cadastrar alunos.
          </p>
        </div>
      ) : filtrados.length === 0 ? (
        <p className="text-text-muted px-6 py-14 text-center text-sm">
          Nenhum aluno encontrado nesta turma.
        </p>
      ) : (
        <>
          {/* Tabela — computador. */}
          <table className="hidden w-full sm:table">
            <thead>
              <tr
                className="bg-surface-2 text-left text-[11px] font-semibold tracking-wide uppercase"
                style={{ color: "var(--text-muted)" }}
              >
                <th className="px-6 py-3.5 font-semibold">Aluno</th>
                <th className="px-3 py-3.5 font-semibold">RA</th>
                <th className="px-6 py-3.5 text-right font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((aluno) => (
                <tr key={aluno.ra} style={{ borderTop: "1px solid var(--border)" }}>
                  <td className="px-6 py-3.5">
                    <div className="flex items-center gap-3">
                      <FotoOuAvatar aluno={aluno} tamanho={36} versaoFotos={versaoFotos} />
                      <span className="text-text text-sm font-semibold">{aluno.nome}</span>
                      <BadgeSemReconhecimento aluno={aluno} />
                    </div>
                  </td>
                  <td className="px-3 py-3.5">
                    <span className="text-text-body text-sm">{aluno.ra}</span>
                  </td>
                  <td className="px-6 py-3.5 text-right">
                    {/* gap-3: os botoes tem 32px e area de toque de 44, entao
                        precisam de 12px entre si para nao se cobrirem. */}
                    <div className="flex items-center justify-end gap-3">
                      <BotaoEditar aluno={aluno} aoEditar={aoEditar} />
                      <BotaoExcluir aluno={aluno} aoExcluir={aoExcluir} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Cartoes — celular. */}
          <ul className="flex flex-col sm:hidden">
            {filtrados.map((aluno) => (
              <li
                key={aluno.ra}
                className="flex items-center gap-3 px-5 py-4"
                style={{ borderTop: "1px solid var(--border)" }}
              >
                <FotoOuAvatar aluno={aluno} tamanho={40} versaoFotos={versaoFotos} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-text truncate text-sm font-semibold">{aluno.nome}</p>
                    <BadgeSemReconhecimento aluno={aluno} />
                  </div>
                  <p className="text-text-muted text-xs">Matrícula {aluno.ra}</p>
                </div>
                <BotaoEditar aluno={aluno} aoEditar={aoEditar} />
                <BotaoExcluir aluno={aluno} aoExcluir={aoExcluir} />
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

/**
 * Mostra a miniatura do rosto do aluno quando ele tem reconhecimento; senao
 * (ou se a imagem falhar) cai pro avatar de iniciais.
 *
 * A thumb vem da ponte /api/admin/alunos/{ra}/foto (nao e' asset remoto pro
 * next/image, por isso o <img> cru). onError cobre o caso raro de a rota
 * responder 404/erro mesmo com tem_reconhecimento=true (dado dessincronizado).
 */
function FotoOuAvatar({
  aluno,
  tamanho,
  versaoFotos,
}: {
  aluno: AlunoAdmin;
  tamanho: number;
  versaoFotos: number;
}) {
  const [erro, setErro] = useState(false);
  // Uma falha anterior nao pode prender o avatar depois que a lista recarregou (o
  // aluno pode ter ganhado foto no meio-tempo): cada versao nova zera o erro.
  const [versaoDoErro, setVersaoDoErro] = useState(versaoFotos);
  const falhou = erro && versaoDoErro === versaoFotos;

  if (!aluno.tem_reconhecimento || falhou) {
    return <AvatarAluno nome={aluno.nome} ra={aluno.ra} tamanho={tamanho} />;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- thumb servida pela rota /api/admin/alunos/{ra}/foto (nao e' asset remoto pro next/image)
    <img
      src={`/api/admin/alunos/${encodeURIComponent(aluno.ra)}/foto?v=${versaoFotos}`}
      alt={`Foto de ${aluno.nome}`}
      width={tamanho}
      height={tamanho}
      onError={() => {
        setErro(true);
        setVersaoDoErro(versaoFotos);
      }}
      className="flex-none rounded-full object-cover"
      style={{ width: tamanho, height: tamanho }}
    />
  );
}

/** Etiqueta de aviso quando o aluno nao tem foto — a camera nao o reconhece. */
function BadgeSemReconhecimento({ aluno }: { aluno: AlunoAdmin }) {
  if (aluno.tem_reconhecimento) return null;
  return (
    <span
      className="flex-none rounded-full px-2 py-0.5 text-[10px] font-semibold"
      style={{ background: "var(--warn-bg)", color: "var(--warn-fg)" }}
      title="Este aluno não tem foto — a câmera não o reconhece automaticamente."
    >
      Sem reconhecimento facial
    </span>
  );
}

/** Botao de editar — abre o modal de edicao (nome/turma/foto) na vista. */
function BotaoEditar({
  aluno,
  aoEditar,
}: {
  aluno: AlunoAdmin;
  aoEditar: (aluno: AlunoAdmin) => void;
}) {
  return (
    <BotaoIcone
      rotulo={`Editar ${aluno.nome}`}
      aoClicar={() => aoEditar(aluno)}
      tamanho={32}
      cor="var(--text-muted)"
    >
      <IconLapis />
    </BotaoIcone>
  );
}

/** Botao de excluir — abre o modal de confirmacao (2 estagios) na vista. */
function BotaoExcluir({
  aluno,
  aoExcluir,
}: {
  aluno: AlunoAdmin;
  aoExcluir: (aluno: AlunoAdmin) => void;
}) {
  return (
    <BotaoIcone
      rotulo={`Excluir ${aluno.nome}`}
      aoClicar={() => aoExcluir(aluno)}
      tamanho={32}
      cor="var(--danger)"
    >
      <IconLixeira />
    </BotaoIcone>
  );
}
