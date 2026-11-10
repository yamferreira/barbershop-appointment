import { db } from "./prisma"

/**
 * Se a barbearia tem mais de um barbeiro ativo agora.
 *
 * A interface se adapta a isso: com um só barbeiro, nomeá-lo em todo lugar
 * (filtros, "com Fulano", seletor de quem não atende) é ruído. Barbeiro
 * inativo não conta, mas os agendamentos dele continuam existindo e aparecendo
 * no admin como histórico.
 */
export const hasMultipleActiveBarbers = async () =>
  (await db.barber.count({ where: { active: true } })) > 1
