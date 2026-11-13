import { getBarbershopDayKey } from "./timezone"

/**
 * Helpers para a coluna `BlockedDate.date`, que é `@db.Date` (dia sem hora).
 *
 * O Prisma grava e lê esse tipo pela porção UTC do `Date`, então um valor vindo
 * do banco chega como meia-noite UTC. Formatar ou comparar isso no fuso local
 * desloca o dia (em UTC-3, `2026-08-01T00:00:00Z` vira 31/07 às 21h). Estas
 * funções fazem a ponte entre o dia do calendário e o `Date` que o Prisma
 * espera, sem depender do fuso de quem executa.
 */

/** Chave "yyyy-MM-dd" -> `Date` que o Prisma grava como esse mesmo dia. */
export const dayKeyToDateOnly = (dayKey: string) =>
  new Date(`${dayKey}T00:00:00.000Z`)

/** `Date` vindo do banco (meia-noite UTC) -> chave "yyyy-MM-dd". */
export const dateOnlyToDayKey = (date: Date) => date.toISOString().slice(0, 10)

/**
 * Instante -> dia da barbearia em que ele cai, no formato da coluna. Um
 * agendamento às 22:00 de São Paulo já é o dia seguinte em UTC, e o bloqueio
 * que vale é o do dia de São Paulo.
 */
export const toDateOnly = (date: Date) =>
  dayKeyToDateOnly(getBarbershopDayKey(date))

/**
 * `Date` vindo do banco -> mesmo dia como data de parede local (meia-noite no
 * fuso de quem executa), para exibir com `format` sem deslocar o dia.
 */
export const fromDateOnly = (date: Date) =>
  new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
