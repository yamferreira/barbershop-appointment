import "server-only"

import { auth } from "./auth-config"
import { serviceDisplayOrder } from "./booking-display"
import { db } from "./prisma"

/**
 * Agendamentos do usuário LOGADO, para a home e /bookings.
 *
 * Estas funções moravam em `app/_actions/get-bookings.ts`, um arquivo
 * "use server". Lá, cada export vira endpoint público (server action) e elas
 * recebiam `userId` por parâmetro: qualquer pessoa, até anônima, conseguia
 * pedir os agendamentos de outro usuário com um POST, telefone incluso.
 *
 * Agora:
 * - `import "server-only"` faz o build falhar se um client component importar
 *   este módulo;
 * - não é "use server", então nada aqui vira server action;
 * - o usuário vem da sessão (`auth()`), nunca de um id passado por fora. Sem
 *   sessão, a lista é vazia.
 */

const bookingInclude = {
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
  // Só o nome: `calendarToken` é segredo.
  barber: { select: { name: true } },
} as const

const currentUserId = async () => {
  const session = await auth()
  return session?.user?.id ?? null
}

export const getConfirmedBookings = async () => {
  const userId = await currentUserId()
  if (!userId) return []

  return db.booking.findMany({
    where: {
      userId,
      date: {
        gte: new Date(),
      },
      // Cancelar pelo cliente só muda o status; sem este filtro o agendamento
      // cancelado continuaria na lista, com o botão de cancelar.
      status: { not: "CANCELADO" },
    },
    include: bookingInclude,
    orderBy: {
      date: "asc",
    },
  })
}

export const getFinishedBookings = async () => {
  const userId = await currentUserId()
  if (!userId) return []

  return db.booking.findMany({
    where: {
      userId,
      date: {
        lt: new Date(),
      },
    },
    include: bookingInclude,
    orderBy: {
      date: "desc",
    },
  })
}
