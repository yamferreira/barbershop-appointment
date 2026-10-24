"use server"

import { revalidatePath } from "next/cache"
import { endOfDay, format, set, startOfDay } from "date-fns"
import { Prisma } from "@/app/generated/prisma"
import { requireBarbeiro } from "@/app/_lib/auth"
import { findBlockForBarber } from "@/app/_lib/blocked-dates"
import {
  CLOSING_HOUR,
  getBookingEnd,
  getClosingTime,
  intervalsOverlap,
} from "@/app/_lib/schedule"
import { db } from "@/app/_lib/prisma"

/**
 * Conta agendamentos por dia (yyyy-MM-dd) num intervalo, para os badges do
 * calendário mensal do admin. Conta só CONFIRMADO (o que ainda vai
 * acontecer): cancelados e concluídos ficam fora do resumo, um dia só com
 * eles aparece sem indicador. A lista de detalhes da página continua
 * mostrando todos os status, com a marcação visual que já os diferencia.
 *
 * `barberId` restringe a contagem a um barbeiro; sem ele, soma todos.
 */
export const getMonthBookingCounts = async ({
  from,
  to,
  barberId,
}: {
  from: Date
  to: Date
  barberId?: string
}) => {
  await requireBarbeiro()

  const bookings = await db.booking.findMany({
    where: {
      date: {
        gte: startOfDay(from),
        lte: endOfDay(to),
      },
      status: "CONFIRMADO",
      ...(barberId && { barberId }),
    },
    select: { date: true },
  })

  const counts: Record<string, number> = {}
  for (const booking of bookings) {
    const key = format(booking.date, "yyyy-MM-dd")
    counts[key] = (counts[key] ?? 0) + 1
  }
  return counts
}

export const updateBookingStatus = async (
  bookingId: string,
  status: "CONCLUIDO" | "CANCELADO",
) => {
  await requireBarbeiro()

  const booking = await db.booking.findUnique({
    where: { id: bookingId },
  })

  if (!booking) {
    return {
      success: false as const,
      message: "Agendamento não encontrado.",
    }
  }

  await db.booking.update({
    where: { id: bookingId },
    data: { status },
  })

  revalidatePath("/admin")
  revalidatePath("/admin/agendamentos")

  return { success: true as const }
}

export const rescheduleBooking = async (
  bookingId: string,
  novaData: Date,
  novoHorario: string,
) => {
  await requireBarbeiro()

  const booking = await db.booking.findUnique({
    where: { id: bookingId },
  })

  if (!booking) {
    return {
      success: false as const,
      message: "Agendamento não encontrado.",
    }
  }

  if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(novoHorario)) {
    return {
      success: false as const,
      message: "Horário inválido. Use o formato HH:mm.",
    }
  }

  const [hours, minutes] = novoHorario.split(":").map(Number)
  const newDate = set(novaData, {
    hours,
    minutes,
    seconds: 0,
    milliseconds: 0,
  })

  if (newDate.getDay() === 0) {
    return {
      success: false as const,
      message: "Barbearia fechada aos domingos.",
    }
  }

  // O reagendamento mantém o barbeiro do agendamento, então o bloqueio que
  // vale é o da barbearia inteira ou o desse barbeiro.
  const blockedDate = await findBlockForBarber(newDate, booking.barberId)
  if (blockedDate) {
    return {
      success: false as const,
      message: `Indisponível: ${blockedDate.reason ?? "Data bloqueada"}`,
    }
  }

  // A duração vem da coluna do próprio Booking, não do serviço: o agendamento
  // pode ter vários serviços e ocupa a soma deles, e ler pelo serviço legado
  // devolveria só a primeira parcela.
  const newEnd = getBookingEnd(newDate, booking.durationMinutes)

  // O agendamento tem que caber inteiro no expediente: às 19:30 um de 1h
  // terminaria depois do fechamento.
  if (newEnd > getClosingTime(newDate)) {
    return {
      success: false as const,
      message: `Esse horário ultrapassa o fechamento (${CLOSING_HOUR}h). Escolha outro.`,
    }
  }

  // Conflito é de intervalo, não de horário exato. Um agendamento ocupa
  // [date, date + durationMinutes), então reagendar para 11:00 algo de 70min
  // atropela o das 12:00 sem repetir a data — que é tudo que o índice único
  // parcial `Booking_barberId_date_active_key` pega sozinho.
  //
  // Sem filtro por serviço: para o mesmo barbeiro, qualquer agendamento ativo
  // naquele intervalo conflita, independente do serviço. Os agendamentos dos
  // outros barbeiros não entram: a agenda de cada um é independente.
  const dayBookings = await db.booking.findMany({
    where: {
      barberId: booking.barberId,
      date: {
        gte: startOfDay(newDate),
        lte: endOfDay(newDate),
      },
      id: { not: bookingId },
      status: { not: "CANCELADO" },
    },
    select: { date: true, durationMinutes: true },
  })

  const hasConflict = dayBookings.some((other) =>
    intervalsOverlap(
      newDate,
      newEnd,
      other.date,
      getBookingEnd(other.date, other.durationMinutes),
    ),
  )

  if (hasConflict) {
    return {
      success: false as const,
      message: "Já existe um agendamento nesse horário.",
    }
  }

  try {
    await db.booking.update({
      where: { id: bookingId },
      data: { date: newDate },
    })
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return {
        success: false as const,
        message: "Já existe um agendamento nesse horário.",
      }
    }
    throw error
  }

  revalidatePath("/admin")
  revalidatePath("/admin/agendamentos")

  return { success: true as const }
}
