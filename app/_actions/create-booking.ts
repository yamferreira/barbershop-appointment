"use server"

import { endOfDay, startOfDay } from "date-fns"
import { Prisma } from "../generated/prisma"
import { findBlockForBarber } from "../_lib/blocked-dates"
import { db } from "../_lib/prisma"
import {
  CLOSING_HOUR,
  getBookingEnd,
  getClosingTime,
  intervalsOverlap,
} from "../_lib/schedule"
import { auth } from "../_lib/auth-config"

interface CreateBookingParams {
  serviceIds: string[]
  barberId: string
  date: Date
  guestName?: string
  guestPhone?: string
}

export const createBooking = async (params: CreateBookingParams) => {
  const session = await auth()

  let guestName: string | undefined
  let guestPhone: string | undefined

  if (!session?.user) {
    guestName = params.guestName?.trim()
    if (!guestName) {
      return {
        success: false as const,
        message: "Informe seu nome para agendar sem login.",
      }
    }
    guestPhone = params.guestPhone?.trim() || undefined
  }

  if (params.date.getDay() === 0) {
    return {
      success: false as const,
      message: "Barbearia fechada aos domingos.",
    }
  }

  // `barberId` vem do client, então não dá para confiar nele: precisa existir e
  // estar ativo. Fora isso, qualquer id inventado cairia direto na FK.
  const barber =
    typeof params.barberId === "string"
      ? await db.barber.findUnique({
          where: { id: params.barberId },
          select: { id: true, active: true },
        })
      : null
  if (!barber || !barber.active) {
    return {
      success: false as const,
      message: "Barbeiro não encontrado.",
    }
  }

  const blockedDate = await findBlockForBarber(params.date, barber.id)
  if (blockedDate) {
    return {
      success: false as const,
      message: `Indisponível: ${blockedDate.reason ?? "Data bloqueada"}`,
    }
  }

  // Validação real de conflito. O índice único parcial só protege contra
  // (barbeiro, `date`) idênticos, e um agendamento ocupa um intervalo: às 11:00
  // com 70min atropela o das 12:00 sem repetir a data. A lista de horários do
  // client filtra isso por conveniência, mas pode estar desatualizada.
  // Repetir o mesmo serviço não muda nada para o cliente e a chave composta de
  // BookingService recusaria a segunda linha, então o pedido é normalizado.
  const serviceIds = [...new Set(params.serviceIds)]

  if (serviceIds.length === 0) {
    return {
      success: false as const,
      message: "Selecione pelo menos um serviço.",
    }
  }

  const services = await db.barbershopService.findMany({
    where: { id: { in: serviceIds } },
    select: { id: true, durationMinutes: true },
  })

  // `findMany` devolve só o que existe: se veio menos do que foi pedido, algum
  // id é inválido e o agendamento não pode ser criado pela metade.
  if (services.length !== serviceIds.length) {
    return {
      success: false as const,
      message: "Serviço não encontrado.",
    }
  }

  const totalDurationMinutes = services.reduce(
    (sum, service) => sum + service.durationMinutes,
    0,
  )

  const newStart = params.date
  const newEnd = getBookingEnd(newStart, totalDurationMinutes)

  if (newEnd > getClosingTime(newStart)) {
    return {
      success: false as const,
      message: `Esse horário ultrapassa o fechamento (${CLOSING_HOUR}h). Escolha outro.`,
    }
  }

  // Só as reservas deste barbeiro contam: a agenda de cada um é independente.
  const dayBookings = await db.booking.findMany({
    where: {
      barberId: barber.id,
      date: {
        gte: startOfDay(params.date),
        lte: endOfDay(params.date),
      },
      status: { not: "CANCELADO" },
    },
    // A duração vem da coluna do próprio Booking, não do serviço: um
    // agendamento com vários serviços ocupa a soma deles, e ler pelo serviço
    // antigo devolveria só a primeira parcela.
    select: { date: true, durationMinutes: true },
  })

  const hasConflict = dayBookings.some((booking) =>
    intervalsOverlap(
      newStart,
      newEnd,
      booking.date,
      getBookingEnd(booking.date, booking.durationMinutes),
    ),
  )

  if (hasConflict) {
    return {
      success: false as const,
      message: "Esse horário conflita com outro agendamento. Escolha outro.",
    }
  }

  try {
    await db.booking.create({
      data: {
        date: params.date,
        barberId: barber.id,
        durationMinutes: totalDurationMinutes,
        userId: session?.user?.id as string | undefined,
        guestName,
        guestPhone,
        services: {
          create: serviceIds.map((serviceId) => ({ serviceId })),
        },
        // Coluna antiga, ainda NOT NULL até a migração que a remove. Nenhuma
        // tela lê mais `booking.service` — todas passaram para
        // `booking.services` —, então isso aqui é só para satisfazer a coluna
        // enquanto ela existe, e sai junto com ela.
        serviceId: serviceIds[0],
      },
    })
    return { success: true as const }
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return {
        success: false as const,
        message: "Esse horário acabou de ser reservado. Escolha outro horário.",
      }
    }
    throw error
  }
}
