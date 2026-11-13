import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { db } from "@/app/_lib/prisma"
import AdminMonthCalendar from "@/app/_components/ui/admin-month-calendar"
import AdminBookingItem from "@/app/_components/ui/admin-booking-item"
import AdminBarberFilter from "@/app/_components/ui/admin-barber-filter"
import { getMonthGridRange } from "@/app/_lib/calendar-grid"
import { serviceDisplayOrder } from "@/app/_lib/booking-display"
import {
  calendarDayFromKey,
  calendarDayKey,
  getBarbershopDayRange,
  getBarbershopTodayKey,
  isDayKey,
} from "@/app/_lib/timezone"
import { getMonthBookingCounts } from "./actions"

interface AdminAgendamentosPageProps {
  searchParams: Promise<{ data?: string; barbeiro?: string }>
}

const AdminAgendamentosPage = async ({
  searchParams,
}: AdminAgendamentosPageProps) => {
  const { data, barbeiro } = await searchParams
  // Sem `?data=` (ou com uma inválida), hoje em São Paulo, não no servidor.
  const selectedDay = isDayKey(data) ? data : getBarbershopTodayKey()
  // Data de parede, só para a grade do mês e o título.
  const selectedDate = calendarDayFromKey(selectedDay)
  const dayRange = getBarbershopDayRange(selectedDay)

  const { start: gridStart, end: gridEnd } = getMonthGridRange(selectedDate)

  // Admin enxerga todos os barbeiros (inclusive inativos, que ainda podem ter
  // agendamentos). Um id desconhecido na URL vira "Todos".
  //
  // Com um só barbeiro ativo o filtro some e a lista mostra tudo, inclusive o
  // histórico de quem saiu. Um `?barbeiro=` que tenha ficado na URL é ignorado:
  // sem o filtro na tela, não haveria como voltar para "Todos".
  const barbers = await db.barber.findMany({
    select: { id: true, name: true, active: true },
    orderBy: [{ createdAt: "asc" }, { name: "asc" }],
  })
  const activeBarbers = barbers.filter((barber) => barber.active)
  const showBarberFilter = activeBarbers.length > 1
  const soleActiveBarberId =
    activeBarbers.length === 1 ? activeBarbers[0].id : undefined
  const selectedBarberId = showBarberFilter
    ? barbers.find((barber) => barber.id === barbeiro)?.id
    : undefined

  const [bookings, monthCounts] = await Promise.all([
    db.booking.findMany({
      where: {
        ...(selectedBarberId && { barberId: selectedBarberId }),
        date: { gte: dayRange.start, lt: dayRange.end },
      },
      include: {
        services: { include: { service: true }, ...serviceDisplayOrder },
        user: true,
        barber: { select: { name: true } },
      },
      // BookingStatus é um enum nativo do Postgres declarado como
      // CONFIRMADO, CONCLUIDO, CANCELADO (nessa ordem) — ordenar por ele
      // agrupa nessa mesma prioridade, com horário como desempate dentro
      // de cada grupo.
      orderBy: [{ status: "asc" }, { date: "asc" }],
    }),
    getMonthBookingCounts({
      from: calendarDayKey(gridStart),
      to: calendarDayKey(gridEnd),
      barberId: selectedBarberId,
    }),
  ])

  return (
    <div className="space-y-6 p-5">
      <h1 className="text-xl font-bold">Agendamentos</h1>

      {showBarberFilter && (
        <AdminBarberFilter
          barbers={barbers}
          selectedBarberId={selectedBarberId}
          basePath="/admin/agendamentos"
          params={{ data }}
        />
      )}

      <AdminMonthCalendar
        selectedDay={selectedDay}
        initialMonthCounts={monthCounts}
        barberId={selectedBarberId}
      />

      {/* scroll-mt: a rolagem até aqui para abaixo da navegação fixa do admin. */}
      <div id="agendamentos-do-dia" className="scroll-mt-28 space-y-3">
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
              <AdminBookingItem
                key={booking.id}
                booking={booking}
                soleActiveBarberId={soleActiveBarberId}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default AdminAgendamentosPage
