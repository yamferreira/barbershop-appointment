"use server"

import { revalidatePath } from "next/cache"
import { endOfDay, format, startOfDay } from "date-fns"
import { Prisma } from "@/app/generated/prisma"
import { requireBarbeiro } from "@/app/_lib/auth"
import { toDateOnly } from "@/app/_lib/date-only"
import {
  formatServiceNames,
  serviceDisplayOrder,
} from "@/app/_lib/booking-display"
import { db } from "@/app/_lib/prisma"

export interface ConflictingBooking {
  id: string
  clientName: string
  /** Barbeiro do agendamento, para o aviso de bloqueio da barbearia inteira. */
  barberName: string
  /** Todos os serviços do agendamento, já concatenados para exibição. */
  serviceNames: string
  time: string
}

type BlockDateResult =
  | { success: true }
  | { success: false; needsConfirmation: true; bookings: ConflictingBooking[] }
  | { success: false; needsConfirmation: false; message: string }

/**
 * Agendamentos ativos no dia. `barberId` restringe a um barbeiro (bloqueio
 * individual); sem ele, lista os de todos (bloqueio da barbearia inteira).
 */
export const getBookingsOnDate = async (
  date: Date,
  barberId?: string,
): Promise<ConflictingBooking[]> => {
  const bookings = await db.booking.findMany({
    where: {
      ...(barberId && { barberId }),
      date: {
        gte: startOfDay(date),
        lte: endOfDay(date),
      },
      status: { not: "CANCELADO" },
    },
    include: {
      services: { include: { service: true }, ...serviceDisplayOrder },
      user: true,
      barber: { select: { name: true } },
    },
    orderBy: {
      date: "asc",
    },
  })

  // Sem faixa de horário aqui de propósito: o aviso de bloqueio responde "quem
  // já está marcado nesse dia", não quanto tempo cada um ocupa.
  return bookings.map((booking) => ({
    id: booking.id,
    clientName: booking.user?.name ?? booking.guestName ?? "Cliente sem nome",
    barberName: booking.barber.name,
    serviceNames: formatServiceNames(booking.services),
    time: format(booking.date, "HH:mm"),
  }))
}

/**
 * `barberId` nulo bloqueia a barbearia inteira; preenchido, só aquele
 * barbeiro.
 */
export const blockDate = async (
  date: Date,
  reason?: string,
  confirmed?: boolean,
  barberId?: string | null,
): Promise<BlockDateResult> => {
  await requireBarbeiro()

  const blockedDay = toDateOnly(date)
  const scopeBarberId = barberId || null

  if (scopeBarberId) {
    const barber = await db.barber.findUnique({
      where: { id: scopeBarberId },
      select: { id: true },
    })
    if (!barber) {
      return {
        success: false,
        needsConfirmation: false,
        message: "Barbeiro não encontrado.",
      }
    }
  }

  // Um bloqueio da barbearia inteira já cobre qualquer barbeiro, então um
  // individual no mesmo dia seria redundante e é recusado. O contrário é
  // permitido: bloquear a barbearia com bloqueios individuais já existentes
  // mantém os dois, e desfazer o geral devolve os individuais.
  const existingBlock = await db.blockedDate.findFirst({
    where: {
      date: blockedDay,
      OR: scopeBarberId
        ? [{ barberId: null }, { barberId: scopeBarberId }]
        : [{ barberId: null }],
    },
  })

  if (existingBlock) {
    return {
      success: false,
      needsConfirmation: false,
      message:
        existingBlock.barberId === null
          ? "Esse dia já está bloqueado para a barbearia inteira."
          : "Esse dia já está bloqueado para esse barbeiro.",
    }
  }

  // Bloquear um dia com agendamentos ativos apenas avisa o barbeiro; nenhum
  // agendamento é cancelado ou alterado automaticamente. Avisar o cliente é
  // responsabilidade manual, fora do sistema.
  if (!confirmed) {
    // `Booking.date` é um DateTime comum, então a busca por conflito usa o dia
    // do calendário local escolhido pelo barbeiro, não o Date normalizado em UTC.
    const bookings = await getBookingsOnDate(date, scopeBarberId ?? undefined)
    if (bookings.length > 0) {
      return { success: false, needsConfirmation: true, bookings }
    }
  }

  try {
    await db.blockedDate.create({
      data: {
        date: blockedDay,
        barberId: scopeBarberId,
        reason: reason?.trim() || null,
      },
    })
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return {
        success: false,
        needsConfirmation: false,
        message: "Esse dia já está bloqueado.",
      }
    }
    throw error
  }

  revalidatePath("/admin/bloqueios")

  return { success: true }
}

export const unblockDate = async (id: string) => {
  await requireBarbeiro()

  const blockedDate = await db.blockedDate.findUnique({
    where: { id },
  })

  if (!blockedDate) {
    return {
      success: false as const,
      message: "Bloqueio não encontrado.",
    }
  }

  await db.blockedDate.delete({
    where: { id },
  })

  revalidatePath("/admin/bloqueios")

  return { success: true as const }
}
