import { addDays, addMinutes, subDays } from "date-fns"
import { CALENDAR_TOKEN_PATTERN } from "@/app/_lib/calendar-token"
import { formatServiceNames } from "@/app/_lib/booking-display"
import { buildCalendar, type IcsEvent } from "@/app/_lib/ics"
import { db } from "@/app/_lib/prisma"

/**
 * GET /api/calendar/<token>.ics — feed iCalendar da agenda de um barbeiro,
 * para assinar no Google Agenda ou no calendário do iPhone.
 *
 * O token (`Barber.calendarToken`) é a única credencial: quem tem a URL vê
 * nomes e telefones dos clientes. Por isso:
 * - token malformado, inexistente ou de barbeiro inativo dão o MESMO 404, sem
 *   dizer qual dos casos foi;
 * - `no-store`: nada de cache em CDN ou proxy guardando a agenda;
 * - a consulta seleciona só o que vira evento.
 *
 * A sincronização é só de ida: editar o evento no calendário não muda nada
 * aqui.
 */

// Lê o banco a cada chamada; nunca pode ser pré-renderizada nem cacheada.
export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/** Janela do feed: 30 dias para trás (histórico recente) e 180 para a frente. */
const PAST_DAYS = 30
const FUTURE_DAYS = 180

const notFound = () =>
  new Response("Not found", {
    status: 404,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  })

/**
 * Telefone guardado → "(11) 91234-5678" (ou "(11) 1234-5678"). Fora do padrão,
 * sai como veio.
 */
const formatPhone = (stored: string) => {
  const digits = stored.replace(/\D/g, "")
  const m = digits.match(/^(\d{2})(\d{4,5})(\d{4})$/)
  return m ? `(${m[1]}) ${m[2]}-${m[3]}` : stored
}

export const GET = async (
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) => {
  const { token: segment } = await params

  // O segmento chega como "<token>.ics". Qualquer outra forma é 404 sem nem
  // consultar o banco.
  const match = /^(.+)\.ics$/.exec(segment)
  const token = match?.[1]
  if (!token || !CALENDAR_TOKEN_PATTERN.test(token)) return notFound()

  const barber = await db.barber.findUnique({
    where: { calendarToken: token },
    select: { id: true, name: true, active: true },
  })
  if (!barber || !barber.active) return notFound()

  const now = new Date()
  const bookings = await db.booking.findMany({
    where: {
      barberId: barber.id,
      // Cancelado some do feed: o calendário remove o evento na próxima
      // atualização, porque o UID dele deixa de aparecer.
      status: { not: "CANCELADO" },
      date: {
        gte: subDays(now, PAST_DAYS),
        lte: addDays(now, FUTURE_DAYS),
      },
    },
    select: {
      id: true,
      date: true,
      durationMinutes: true,
      updatedAt: true,
      guestName: true,
      // Nome histórico: guarda o telefone do agendamento.
      guestPhone: true,
      user: { select: { name: true } },
      services: {
        select: { service: { select: { name: true } } },
        orderBy: { service: { createdAt: "asc" } },
      },
    },
    orderBy: { date: "asc" },
  })

  const events: IcsEvent[] = bookings.map((booking) => {
    const client = booking.user?.name ?? booking.guestName ?? "Cliente sem nome"
    return {
      // UID estável: o mesmo agendamento é sempre o mesmo evento, então
      // reagendar move o evento em vez de duplicar.
      uid: booking.id,
      start: booking.date,
      end: addMinutes(booking.date, booking.durationMinutes),
      updatedAt: booking.updatedAt,
      summary: `${formatServiceNames(booking.services)} · ${client}`,
      description: booking.guestPhone
        ? `Telefone: ${formatPhone(booking.guestPhone)}`
        : "Sem telefone",
    }
  })

  const body = buildCalendar({
    name: `Nobre Barbearia · ${barber.name}`,
    events,
  })

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Cache-Control": "no-store",
      "Content-Disposition": 'inline; filename="agenda.ics"',
      // A URL é uma credencial: não vazar por Referer nem cair em buscador.
      "Referrer-Policy": "no-referrer",
      "X-Robots-Tag": "noindex, nofollow",
    },
  })
}
