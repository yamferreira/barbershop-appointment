"use server"

import { db } from "../_lib/prisma"
import { getBarbershopDayRange, isDayKey } from "../_lib/timezone"

// Os agendamentos do próprio usuário (home e /bookings) NÃO moram aqui: este
// arquivo é "use server" e todo export dele é endpoint público. Eles estão em
// `app/_lib/user-bookings.ts`, que é server-only e lê o usuário da sessão.

interface GetBookingsParams {
  /**
   * Dia do calendário, "yyyy-MM-dd". Não um `Date`: a meia-noite do navegador
   * é um instante, e fora do fuso da barbearia ela cai no dia errado.
   */
  day: string
}

/**
 * Agendamentos que ocupam a agenda no dia, para montar a lista de horários.
 *
 * Não filtra por serviço de propósito: para um mesmo barbeiro, qualquer
 * agendamento ativo às 10:00 ocupa as 10:00, seja Corte ou Barba. Os filtros
 * espelham o índice `Booking_barberId_date_active_key`, que é unique em
 * (`barberId`, `date`) com `WHERE status <> 'CANCELADO'` — horário cancelado
 * volta a ficar livre.
 *
 * Devolve as reservas de todos os barbeiros, com `barberId`: a agenda de cada
 * um é independente, e quem monta a lista de horários separa por barbeiro.
 *
 * `durationMinutes` vem junto porque um agendamento ocupa um intervalo, não um
 * ponto: quem monta a lista de horários precisa saber onde cada um termina. É
 * a coluna do próprio Booking, e não a do serviço, porque um agendamento com
 * vários serviços ocupa a soma das durações deles.
 *
 * O retorno é enxuto de propósito: isso atravessa para o client, e a lista de
 * horários não precisa saber quem reservou o quê.
 */
export const getBookings = async ({ day }: GetBookingsParams) => {
  if (!isDayKey(day)) return []
  const { start, end } = getBarbershopDayRange(day)
  return db.booking.findMany({
    where: {
      date: { gte: start, lt: end },
      status: { not: "CANCELADO" },
    },
    select: { barberId: true, date: true, durationMinutes: true },
  })
}
