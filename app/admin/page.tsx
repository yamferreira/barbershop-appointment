import { endOfDay, startOfDay } from "date-fns"
import Link from "next/link"
import { db } from "@/app/_lib/prisma"
import { serviceDisplayOrder } from "@/app/_lib/booking-display"
import AdminBookingItem from "@/app/_components/ui/admin-booking-item"

const AdminPage = async () => {
  const today = new Date()

  const bookings = await db.booking.findMany({
    where: {
      date: {
        gte: startOfDay(today),
        lte: endOfDay(today),
      },
    },
    include: {
      services: { include: { service: true }, ...serviceDisplayOrder },
      user: true,
    },
    orderBy: {
      date: "asc",
    },
  })

  return (
    <div className="space-y-6 p-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold">Agendamentos de hoje</h1>
        <div className="flex flex-col items-end gap-1">
          <Link
            href="/admin/agendamentos"
            className="hover:text-brand text-sm font-medium underline-offset-4 hover:underline"
          >
            Ver todos os agendamentos
          </Link>
          <Link
            href="/admin/bloqueios"
            className="hover:text-brand text-sm font-medium underline-offset-4 hover:underline"
          >
            Bloquear dias
          </Link>
        </div>
      </div>

      {bookings.length === 0 && (
        <p className="text-muted-foreground text-sm">
          Nenhum agendamento pra hoje.
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
  )
}

export default AdminPage
