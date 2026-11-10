"use server"

import { db } from "../_lib/prisma"

/**
 * Dias bloqueados, para o calendário do cliente riscar o que não atende.
 *
 * Server action pública (o booking-flow chama do browser, sem login), então o
 * `select` é só o que o calendário usa. `reason` fica de fora de propósito: é
 * texto livre do barbeiro ("Compromisso pessoal", "Médico"...) e não é da
 * conta de quem agenda.
 */
export const getBlockedDates = async () => {
  return db.blockedDate.findMany({
    select: { date: true, barberId: true },
  })
}
