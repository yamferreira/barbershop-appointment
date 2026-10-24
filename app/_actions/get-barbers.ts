"use server"

import { db } from "../_lib/prisma"

/**
 * Barbeiros que aceitam agendamento, na ordem de cadastro.
 *
 * Esta action atravessa para o client, então o `select` é explícito e curto:
 * `calendarToken` é segredo e não pode escapar por aqui.
 */
export const getActiveBarbers = async () => {
  return db.barber.findMany({
    where: { active: true },
    select: { id: true, name: true },
    orderBy: [{ createdAt: "asc" }, { name: "asc" }],
  })
}
