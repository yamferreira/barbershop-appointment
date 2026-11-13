import { db } from "@/app/_lib/prisma"
import { serviceDisplayOrder } from "@/app/_lib/booking-display"
import AdminBookingItem from "@/app/_components/ui/admin-booking-item"
import AdminBarberFilter from "@/app/_components/ui/admin-barber-filter"
import {
  getBarbershopDayRange,
  getBarbershopTodayKey,
} from "@/app/_lib/timezone"

interface AdminPageProps {
  searchParams: Promise<{ barbeiro?: string }>
}

const AdminPage = async ({ searchParams }: AdminPageProps) => {
  const { barbeiro } = await searchParams
  // Hoje em São Paulo. Com `startOfDay(new Date())` no servidor (UTC), das
  // 21h à meia-noite o painel já mostraria o dia seguinte.
  const today = getBarbershopDayRange(getBarbershopTodayKey())

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

  const bookings = await db.booking.findMany({
    where: {
      ...(selectedBarberId && { barberId: selectedBarberId }),
      date: { gte: today.start, lt: today.end },
    },
    include: {
      services: { include: { service: true }, ...serviceDisplayOrder },
      user: true,
      barber: { select: { name: true } },
    },
    // Mesma ordem de /admin/agendamentos: CONFIRMADO, CONCLUIDO, CANCELADO
    // (ordem de declaração do enum), com o horário como desempate.
    orderBy: [{ status: "asc" }, { date: "asc" }],
  })

  return (
    <div className="space-y-6 p-5">
      <h1 className="text-xl font-bold">Agendamentos de hoje</h1>

      {showBarberFilter && (
        <AdminBarberFilter
          barbers={barbers}
          selectedBarberId={selectedBarberId}
          basePath="/admin"
        />
      )}

      {bookings.length === 0 && (
        <p className="text-muted-foreground text-sm">
          Nenhum agendamento pra hoje.
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
  )
}

export default AdminPage
