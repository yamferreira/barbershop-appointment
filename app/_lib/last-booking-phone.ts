import "server-only"

import { auth } from "./auth-config"
import { isValidPhone, normalizePhone } from "./phone"
import { db } from "./prisma"

/**
 * Telefone do agendamento mais recente do usuário LOGADO que tenha número,
 * para pré-preencher o campo do próximo agendamento. Sem coluna nova no
 * `User`: o telefone mora no agendamento (`guestPhone`, nome histórico).
 *
 * Server-only e fora de "use server" de propósito: uma server action exportada
 * fica chamável por qualquer um. E o usuário vem da sessão, não de parâmetro,
 * para não existir caminho que entregue o telefone de outra pessoa.
 */
export const getLastBookingPhone = async () => {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) return null

  const booking = await db.booking.findFirst({
    where: { userId, guestPhone: { not: null } },
    orderBy: { createdAt: "desc" },
    select: { guestPhone: true },
  })
  if (!booking?.guestPhone) return null
  const digits = normalizePhone(booking.guestPhone)
  return isValidPhone(digits) ? digits : null
}
