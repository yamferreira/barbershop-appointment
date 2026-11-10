"use server"

import { revalidatePath } from "next/cache"
import { Prisma } from "@/app/generated/prisma"
import { requireBarbeiro } from "@/app/_lib/auth"
import { generateCalendarToken } from "@/app/_lib/calendar-token"
import { db } from "@/app/_lib/prisma"

/**
 * "Gerar novo link": troca o `calendarToken` do barbeiro por 32 bytes
 * aleatórios novos. O link antigo para de funcionar na hora (o feed passa a
 * responder 404 para ele), então quem assinou precisa assinar de novo.
 *
 * Endpoint público como toda server action: `requireBarbeiro()` vem primeiro.
 * Não devolve o token; a página relê do banco depois do `revalidatePath`.
 */
export const regenerateCalendarToken = async (barberId: string) => {
  await requireBarbeiro()

  if (typeof barberId !== "string" || !barberId) {
    return { success: false as const, message: "Barbeiro não encontrado." }
  }

  try {
    await db.barber.update({
      where: { id: barberId },
      data: { calendarToken: generateCalendarToken() },
      select: { id: true },
    })
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return { success: false as const, message: "Barbeiro não encontrado." }
    }
    throw error
  }

  revalidatePath("/admin/calendario")

  return { success: true as const }
}
