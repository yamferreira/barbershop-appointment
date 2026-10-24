import { toDateOnly } from "./date-only"
import { db } from "./prisma"

/**
 * Bloqueio que impede `barberId` de atender em `date`: o da barbearia inteira
 * (`barberId` nulo) ou o dedicado a esse barbeiro.
 *
 * Se existirem os dois, o da barbearia vence, porque o motivo dele (feriado) é
 * o que explica a indisponibilidade para todos.
 */
export const findBlockForBarber = async (date: Date, barberId: string) => {
  const blocks = await db.blockedDate.findMany({
    where: {
      date: toDateOnly(date),
      OR: [{ barberId: null }, { barberId }],
    },
  })
  return blocks.find((block) => block.barberId === null) ?? blocks[0] ?? null
}
