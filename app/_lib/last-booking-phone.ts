import { db } from "./prisma"
import { isValidPhone, normalizePhone } from "./phone"

/**
 * Telefone do agendamento mais recente do usuário que tenha número, para
 * pré-preencher o campo do próximo agendamento. Sem coluna nova no `User`: o
 * telefone mora no agendamento (`guestPhone`, nome histórico).
 *
 * De propósito NÃO é uma server action ("use server"): uma action exportada
 * fica chamável do client com qualquer `userId`, e isso entregaria o telefone
 * de outra pessoa. Só server components chamam isto, com o id da sessão.
 */
export const getLastBookingPhone = async (userId: string) => {
  const booking = await db.booking.findFirst({
    where: { userId, guestPhone: { not: null } },
    orderBy: { createdAt: "desc" },
    select: { guestPhone: true },
  })
  if (!booking?.guestPhone) return null
  const digits = normalizePhone(booking.guestPhone)
  return isValidPhone(digits) ? digits : null
}
