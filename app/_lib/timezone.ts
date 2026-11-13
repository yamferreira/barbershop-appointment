import { tz, TZDate } from "@date-fns/tz"
import { addDays, format, getDay, set } from "date-fns"
import { ptBR } from "date-fns/locale"

/**
 * Fuso da barbearia. Tudo que depende de "que horas são" ou "que dia é" na
 * barbearia passa por aqui, com o fuso explícito.
 *
 * Sem isto, `getHours`, `getDay`, `startOfDay`, `set` e `format` do date-fns
 * usam o fuso de quem executa: a Vercel roda em UTC, então 17:00 em São Paulo
 * virava 20:00 e esbarrava no fechamento, e o admin mostrava 15:00 como 18:00.
 * No navegador o fuso é o do aparelho do cliente, que nem sempre é o da
 * barbearia.
 *
 * Os helpers devolvem `Date` comum (o `TZDate` fica só aqui dentro), porque o
 * valor segue para o Prisma e atravessa server actions.
 */
export const BARBERSHOP_TIME_ZONE = "America/Sao_Paulo"

const inBarbershop = tz(BARBERSHOP_TIME_ZONE)

const toPlainDate = (date: Date) => new Date(date.getTime())

const DAY_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

/**
 * Chave de um dia do calendário, "yyyy-MM-dd". É como um dia viaja entre
 * navegador e servidor: um `Date` à meia-noite é um instante, e a meia-noite
 * de um fuso cai no dia anterior de outro.
 */
export const isDayKey = (value: unknown): value is string => {
  if (typeof value !== "string") return false
  const match = DAY_KEY_PATTERN.exec(value)
  if (!match) return false
  const [, year, month, day] = match.map(Number)
  const check = new Date(Date.UTC(year, month - 1, day))
  return (
    check.getUTCFullYear() === year &&
    check.getUTCMonth() === month - 1 &&
    check.getUTCDate() === day
  )
}

/** Formata no fuso da barbearia, em pt-BR ("HH:mm", "dd 'de' MMMM"...). */
export const formatInBarbershopTz = (date: Date, pattern: string) =>
  format(date, pattern, { in: inBarbershop, locale: ptBR })

/** Dia do calendário da barbearia em que o instante cai. */
export const getBarbershopDayKey = (date: Date) =>
  formatInBarbershopTz(date, "yyyy-MM-dd")

/** Hoje, na barbearia. */
export const getBarbershopTodayKey = () => getBarbershopDayKey(new Date())

/** Dia da semana na barbearia (0 = domingo). */
export const getBarbershopWeekday = (date: Date) =>
  getDay(date, { in: inBarbershop })

/** Instante de um horário de parede na barbearia: ("2026-11-26", "15:00"). */
export const barbershopDateTime = (dayKey: string, time: string) => {
  const [year, month, day] = dayKey.split("-").map(Number)
  const [hours, minutes] = time.split(":").map(Number)
  return toPlainDate(
    new TZDate(year, month - 1, day, hours, minutes, BARBERSHOP_TIME_ZONE),
  )
}

/**
 * O mesmo dia da barbearia, num horário cheio: o fechamento do dia em que um
 * agendamento cai, por exemplo.
 */
export const setBarbershopTime = (date: Date, hours: number, minutes = 0) =>
  toPlainDate(
    set(
      date,
      { hours, minutes, seconds: 0, milliseconds: 0 },
      { in: inBarbershop },
    ),
  )

/**
 * Intervalo do dia na barbearia, para consulta: `gte: start, lt: end`. O fim é
 * exclusivo (a meia-noite seguinte), sem o 23:59:59.999 do `endOfDay`.
 */
export const getBarbershopDayRange = (dayKey: string) => {
  const start = barbershopDateTime(dayKey, "00:00")
  const end = toPlainDate(addDays(new TZDate(start, BARBERSHOP_TIME_ZONE), 1))
  return { start, end }
}

/**
 * Dias de calendário na tela.
 *
 * Os calendários (cliente e admin) montam a grade com `Date` à meia-noite
 * LOCAL de quem executa, e só usam os campos ano/mês/dia: são datas de
 * parede, não instantes. Estes dois convertem entre essa data de parede e a
 * chave, sem fuso nenhum no meio. O instante de verdade sai depois, por
 * `barbershopDateTime`.
 */
export const calendarDayKey = (day: Date) => format(day, "yyyy-MM-dd")

export const calendarDayFromKey = (dayKey: string) => {
  const [year, month, day] = dayKey.split("-").map(Number)
  return new Date(year, month - 1, day)
}
