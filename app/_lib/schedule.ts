import { addMinutes } from "date-fns"
import { setBarbershopTime } from "./timezone"

/** Último horário em que o expediente pode terminar. */
export const CLOSING_HOUR = 20

/**
 * Dois intervalos colidem quando um começa antes do outro terminar e termina
 * depois do outro começar. Encostar não conta: um agendamento que termina
 * 09:30 não conflita com outro que começa 09:30.
 */
export const intervalsOverlap = (
  startA: Date,
  endA: Date,
  startB: Date,
  endB: Date,
) => startA < endB && endA > startB

/**
 * Um agendamento ocupa o intervalo [date, date + duração do serviço).
 */
export const getBookingEnd = (date: Date, durationMinutes: number): Date =>
  addMinutes(date, durationMinutes)

/**
 * Horário de fechamento do dia em que `date` cai, no fuso da barbearia (não no
 * de quem executa: na Vercel, em UTC, 20h seriam 17h de São Paulo).
 */
export const getClosingTime = (date: Date) =>
  setBarbershopTime(date, CLOSING_HOUR)

/** Duração em texto curto: 20min, 1h, 1h10min. */
export const formatDuration = (minutes: number) => {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hours === 0) return `${mins}min`
  if (mins === 0) return `${hours}h`
  return `${hours}h${mins}min`
}

/**
 * Quantos agendamentos futuros e não cancelados um mesmo telefone (ou, logado,
 * a mesma conta) pode ter ao mesmo tempo. Segura quem reserva a agenda inteira
 * de uma vez, de propósito ou por engano, sem atrapalhar quem marca o corte do
 * mês que vem e o do outro.
 */
export const MAX_ACTIVE_BOOKINGS_PER_PHONE = 3
