import { endOfDay, format, isValid, parse, startOfDay } from "date-fns"
import { ptBR } from "date-fns/locale"
import { db } from "@/app/_lib/prisma"
import AdminMonthCalendar from "@/app/_components/ui/admin-month-calendar"
import AdminBookingItem from "@/app/_components/ui/admin-booking-item"
import { getMonthGridRange } from "@/app/_lib/calendar-grid"
import { serviceDisplayOrder } from "@/app/_lib/booking-display"
import { getMonthBookingCounts } from "./actions"

interface AdminAgendamentosPageProps {
  searchParams: Promise<{ data?: string }>
}

const AdminAgendamentosPage = async ({
  searchParams,
}: AdminAgendamentosPageProps) => {
  const { data } = await searchParams
  const parsedDate = data ? parse(data, "yyyy-MM-dd", new Date()) : new Date()
  const selectedDate = isValid(parsedDate) ? parsedDate : new Date()

  const { start: gridStart, end: gridEnd } = getMonthGridRange(selectedDate)

  const [bookings, monthCounts] = await Promise.all([
    db.booking.findMany({
      where: {
        date: {
          gte: startOfDay(selectedDate),
          lte: endOfDay(selectedDate),
        },
      },
      include: {
        services: { include: { service: true }, ...serviceDisplayOrder },
        user: true,
      },
      // BookingStatus é um enum nativo do Postgres declarado como
      // CONFIRMADO, CONCLUIDO, CANCELADO (nessa ordem) — ordenar por ele
      // agrupa nessa mesma prioridade, com horário como desempate dentro
      // de cada grupo.
      orderBy: [{ status: "asc" }, { date: "asc" }],
    }),
    getMonthBookingCounts({ from: gridStart, to: gridEnd }),
  ])

  return (
    <div className="space-y-6 p-5">
      <h1 className="text-xl font-bold">Agendamentos</h1>

      <AdminMonthCalendar
        selectedDate={selectedDate}
        initialMonthCounts={monthCounts}
      />

      <div id="agendamentos-do-dia" className="scroll-mt-4 space-y-3">
        <h2 className="text-muted-foreground text-xs font-bold uppercase">
          {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
        </h2>

        {bookings.length === 0 && (
          <p className="text-muted-foreground text-sm">
            Nenhum agendamento nesse dia.
          </p>
        )}

        {bookings.length > 0 && (
          <div className="space-y-3">
            {bookings.map((booking) => (
              <AdminBookingItem key={booking.id} booking={booking} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default AdminAgendamentosPage
