"use server"

import { revalidatePath } from "next/cache"
import { auth } from "../_lib/auth-config"
import { db } from "../_lib/prisma"

/**
 * Cancelamento feito pelo cliente. Não apaga o registro: marca como CANCELADO,
 * que é o que o admin enxerga e o que o índice parcial
 * `Booking_barberId_date_active_key` ignora, liberando o horário.
 *
 * O nome `deleteBooking` ficou do tempo em que a linha era removida.
 */
export const deleteBooking = async (bookingId: string) => {
  const session = await auth()

  if (!session?.user) {
    return {
      success: false as const,
      message: "Você precisa estar logado para cancelar um agendamento.",
    }
  }

  const booking = await db.booking.findUnique({
    where: { id: bookingId },
  })

  if (!booking || booking.userId !== session.user.id) {
    return {
      success: false as const,
      message: "Agendamento não encontrado.",
    }
  }

  if (booking.status !== "CONFIRMADO") {
    return {
      success: false as const,
      message:
        booking.status === "CANCELADO"
          ? "Este agendamento já foi cancelado."
          : "Este agendamento já foi concluído e não pode ser cancelado.",
    }
  }

  // O status entra no where para que um CONCLUIDO/CANCELADO que apareça entre
  // a leitura acima e a escrita (ex.: o barbeiro concluindo) não seja
  // sobrescrito.
  const { count } = await db.booking.updateMany({
    where: { id: bookingId, status: "CONFIRMADO" },
    data: { status: "CANCELADO" },
  })

  if (count === 0) {
    return {
      success: false as const,
      message: "Este agendamento não pode mais ser cancelado.",
    }
  }

  revalidatePath("/")
  revalidatePath("/bookings")
  revalidatePath("/admin")
  revalidatePath("/admin/agendamentos")

  return { success: true as const }
}
