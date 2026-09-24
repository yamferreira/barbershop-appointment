import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import type {
  Booking,
  BarbershopService,
  User,
  BookingStatus,
} from "@/app/generated/prisma"
import {
  formatBookingEnd,
  formatServiceNames,
} from "@/app/_lib/booking-display"
import { Card, CardContent } from "./card"
import { Badge } from "./badge"
import AdminBookingActions from "./admin-booking-actions"
import RescheduleBookingDialog from "./reschedule-booking-dialog"

interface AdminBookingItemProps {
  booking: Booking & {
    services: { service: BarbershopService }[]
    user: User | null
  }
}

const statusLabel: Record<BookingStatus, string> = {
  CONFIRMADO: "Confirmado",
  CONCLUIDO: "Concluído",
  CANCELADO: "Cancelado",
}

// Cores fixas, independentes do token --brand: o status precisa continuar
// reconhecível à primeira vista mesmo com a paleta verde/dourado da marca
// aplicada ao admin (variant "default" do Badge usa --primary, que sob
// theme-nobre vira dourado — inadequado pra um status, não um destaque).
const statusClassName: Record<BookingStatus, string> = {
  CONFIRMADO: "border-blue-200 bg-blue-50 text-blue-700",
  CONCLUIDO: "border-emerald-200 bg-emerald-50 text-emerald-700",
  CANCELADO: "border-red-200 bg-red-50 text-red-700",
}

const AdminBookingItem = ({ booking }: AdminBookingItemProps) => {
  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-3 p-5">
        <div className="space-y-1">
          <Badge variant="outline" className={statusClassName[booking.status]}>
            {statusLabel[booking.status]}
          </Badge>
          <p className="font-semibold">
            {booking.user?.name ?? booking.guestName ?? "Cliente sem nome"}
          </p>
          <p className="text-muted-foreground text-sm">
            {formatServiceNames(booking.services)}
          </p>
          {booking.status === "CONFIRMADO" && (
            <div className="flex flex-wrap items-center gap-2">
              <AdminBookingActions bookingId={booking.id} />
              <RescheduleBookingDialog
                bookingId={booking.id}
                currentDate={booking.date}
              />
            </div>
          )}
        </div>

        {/* O barbeiro precisa da faixa, não do início: é ela que diz quando a
            cadeira volta a ficar livre. */}
        <div className="shrink-0 text-right">
          <p className="text-lg font-bold">
            {format(booking.date, "HH:mm", { locale: ptBR })}
          </p>
          <p className="text-muted-foreground text-xs">
            até {formatBookingEnd(booking.date, booking.durationMinutes)}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

export default AdminBookingItem
