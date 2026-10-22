/**
 * Sincronização dos feriados nacionais como `BlockedDate`, usando a BrasilAPI
 * (pública, sem autenticação). A resposta é uma lista de
 * `{ date: "2026-09-07", name: "Independência do Brasil", type: "national", weekday: "..." }`.
 *
 * Dezembro fica de fora de propósito: é o mês de maior movimento da barbearia,
 * então feriados de dezembro continuam sendo decisão manual do barbeiro.
 *
 * Este módulo NÃO faz controle de acesso e deliberadamente não é um
 * `"use server"`: quem chama é que autoriza — a server action confere
 * `requireBarbeiro()` e a rota de cron confere o `CRON_SECRET`. Exportar isto
 * de um arquivo `"use server"` publicaria uma action sem autenticação.
 */
import { toDateOnly } from "@/app/_lib/date-only"
import { db } from "@/app/_lib/prisma"

const BRASIL_API_URL = "https://brasilapi.com.br/api/feriados/v1"

const DECEMBER = 11

interface BrasilApiHoliday {
  date: string
  name: string
  type: string
}

export type SyncHolidaysResult =
  | { success: true; created: number }
  | { success: false; message: string }

const isHoliday = (value: unknown): value is BrasilApiHoliday => {
  if (typeof value !== "object" || value === null) return false
  const holiday = value as Record<string, unknown>
  return (
    typeof holiday.date === "string" &&
    typeof holiday.name === "string" &&
    typeof holiday.type === "string"
  )
}

/**
 * `"2026-09-07"` -> dia do calendário local.
 *
 * `new Date("2026-09-07")` seria interpretado como meia-noite **UTC**, o que em
 * UTC-3 recuaria o dia. Por isso a string é quebrada e remontada à mão, e só
 * depois passa por `toDateOnly()`, o mesmo caminho usado no resto do projeto.
 */
const parseHolidayDate = (isoDay: string) => {
  const [year, month, day] = isoDay.split("-").map(Number)
  return new Date(year, month - 1, day)
}

const fetchHolidays = async (year: number): Promise<BrasilApiHoliday[]> => {
  const response = await fetch(`${BRASIL_API_URL}/${year}`, {
    cache: "no-store",
  })

  if (!response.ok) {
    throw new Error(`BrasilAPI respondeu ${response.status} para ${year}.`)
  }

  const data: unknown = await response.json()

  if (!Array.isArray(data)) {
    throw new Error(`Resposta inesperada da BrasilAPI para ${year}.`)
  }

  return data.filter(isHoliday)
}

export const syncNationalHolidays = async (): Promise<SyncHolidaysResult> => {
  const currentYear = new Date().getFullYear()

  let holidays: BrasilApiHoliday[]
  try {
    // O ano seguinte também entra para que janeiro já esteja coberto quando a
    // sincronização for feita no fim do ano.
    const years = await Promise.all([
      fetchHolidays(currentYear),
      fetchHolidays(currentYear + 1),
    ])
    holidays = years.flat()
  } catch (error) {
    console.error("Falha ao buscar feriados na BrasilAPI:", error)
    return {
      success: false,
      message: "Não foi possível buscar os feriados. Tente de novo.",
    }
  }

  const today = toDateOnly(new Date())

  const candidates = new Map<number, { date: Date; reason: string }>()

  for (const holiday of holidays) {
    if (holiday.type !== "national") continue

    const localDay = parseHolidayDate(holiday.date)
    if (Number.isNaN(localDay.getTime())) continue
    if (localDay.getMonth() === DECEMBER) continue

    const date = toDateOnly(localDay)
    // Feriados que já passaram não mudam nada na agenda e só poluiriam a lista.
    if (date < today) continue

    candidates.set(date.getTime(), { date, reason: `Feriado: ${holiday.name}` })
  }

  if (candidates.size === 0) {
    return { success: true, created: 0 }
  }

  // Bloqueios manuais na mesma data são preservados: a sincronização só cria o
  // que ainda não existe, nunca atualiza nem apaga um `BlockedDate` existente.
  // Feriado vale para a barbearia inteira (`barberId` nulo), então só um
  // bloqueio geral na mesma data conta como já existente; o de um barbeiro não
  // impede o feriado de ser criado.
  const existing = await db.blockedDate.findMany({
    where: {
      barberId: null,
      date: { in: [...candidates.values()].map(({ date }) => date) },
    },
    select: { date: true },
  })

  for (const { date } of existing) {
    candidates.delete(date.getTime())
  }

  if (candidates.size === 0) {
    return { success: true, created: 0 }
  }

  const { count } = await db.blockedDate.createMany({
    data: [...candidates.values()],
    // Rede de segurança contra duas sincronizações simultâneas: a corrida entre
    // a leitura acima e a escrita esbarraria no índice único parcial de `date`
    // (`WHERE barberId IS NULL`).
    skipDuplicates: true,
  })

  return { success: true, created: count }
}
