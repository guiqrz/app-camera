"use client";

import { useEffect, useRef } from "react";

/** Seletor dos elementos que um modal deve considerar "focaveis" pro trap de Tab. */
const SELETOR_FOCAVEL =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Prende o foco do teclado dentro de um modal enquanto ele esta aberto, e
 * devolve o foco a quem abriu o modal quando ele fecha.
 *
 * Reutilizado pelos 3 modais de Administracao (ModalNovaTurma, ModalNovoAluno,
 * ModalConfirmarExclusao) — todos seguem o mesmo molde de overlay + card, so'
 * precisam prender o Tab dentro do card enquanto `aberto` for true.
 *
 * Uso: `const refModal = useFocoPreso(aberto);` e passe `refModal` na div com
 * `role="dialog"`. O foco inicial (em qual campo o cursor comeca) continua
 * responsabilidade de cada modal — este hook so' cuida do trap e do retorno.
 */
export function useFocoPreso(aberto: boolean) {
  const refModal = useRef<HTMLDivElement>(null);
  const refElementoAnterior = useRef<HTMLElement | null>(null);

  // Guarda quem tinha foco antes do modal abrir, pra devolver ao fechar.
  useEffect(() => {
    if (aberto) {
      refElementoAnterior.current = document.activeElement as HTMLElement | null;
      return;
    }

    // isConnected evita focar um elemento que ja saiu do DOM (ex.: exclusao
    // removeu a linha que tinha o foco antes do modal abrir) — sem essa
    // guarda, focus() em no' desconectado e' inocuo, mas silenciosamente nao
    // devolve o foco a lugar nenhum, deixando o teclado "perdido" no body.
    if (refElementoAnterior.current?.isConnected) {
      refElementoAnterior.current.focus();
    }
    refElementoAnterior.current = null;
  }, [aberto]);

  // Prende o Tab/Shift+Tab dentro do modal enquanto ele esta aberto.
  useEffect(() => {
    if (!aberto) return;

    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key !== "Tab" || !refModal.current) return;

      const focaveis = refModal.current.querySelectorAll<HTMLElement>(SELETOR_FOCAVEL);
      if (focaveis.length === 0) return;

      const primeiro = focaveis[0];
      const ultimo = focaveis[focaveis.length - 1];
      const atual = document.activeElement;

      if (evento.shiftKey) {
        // Shift+Tab no primeiro elemento volta pro ultimo.
        if (atual === primeiro || !refModal.current.contains(atual)) {
          evento.preventDefault();
          ultimo.focus();
        }
      } else {
        // Tab no ultimo elemento volta pro primeiro.
        if (atual === ultimo || !refModal.current.contains(atual)) {
          evento.preventDefault();
          primeiro.focus();
        }
      }
    };

    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [aberto]);

  return refModal;
}
