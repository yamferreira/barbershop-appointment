"use server"

import { endOfDay, startOfDay } from "date-fns"
import { serviceDisplayOrder } from "../_lib/booking-display"
import { db } from "../_lib/prisma"

interface GetBookingsParams {
  date: Date
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
export const getBookings = async ({ date }: GetBookingsParams) => {
  return db.booking.findMany({
    where: {
      date: {
        gte: startOfDay(date),
        lte: endOfDay(date),
      },
      status: { not: "CANCELADO" },
    },
    select: { barberId: true, date: true, durationMinutes: true },
  })
}

export const getConfirmedBookings = async (userId: string) => {
  return db.booking.findMany({
    where: {
      userId,
      date: {
        gte: new Date(),
      },
    },
    include: {
      services: {
        include: {
          service: {
            include: {
              barbershop: true,
            },
          },
        },
        ...serviceDisplayOrder,
      },
      // Só o nome: `calendarToken` é segredo e estas listas vão para o client.
      barber: { select: { name: true } },
    },
    orderBy: {
      date: "asc",
    },
  })
}

export const getFinishedBookings = async (userId: string) => {
  return db.booking.findMany({
    where: {
      userId,
      date: {
        lt: new Date(),
      },
    },
    include: {
      services: {
        include: {
          service: {
            include: {
              barbershop: true,
            },
          },
        },
        ...serviceDisplayOrder,
      },
      // Só o nome: `calendarToken` é segredo e estas listas vão para o client.
      barber: { select: { name: true } },
    },
    orderBy: {
      date: "desc",
    },
  })
}
