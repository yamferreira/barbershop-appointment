import { format, isFuture } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Avatar, AvatarImage } from "./avatar"
import { Badge } from "./badge"
import CancelBookingDialog from "./cancel-booking-dialog"
import { Card, CardContent } from "./card"
import {
  formatBookingEnd,
  formatServiceNames,
} from "../../_lib/booking-display"
import type {
  Barber,
  Barbershop,
  Booking,
  BarbershopService,
} from "../../generated/prisma"

interface BookingItemProps {
  booking: Booking & {
    barber: Pick<Barber, "name">
    services: {
      service: BarbershopService & {
        barbershop: Barbershop
      }
    }[]
  }
}

const BookingItem = ({ booking }: BookingItemProps) => {
  const isConfirmed = isFuture(booking.date)
  // Todo serviço do agendamento é da mesma barbearia, então o primeiro
  // responde por todos.
  const barbershop = booking.services[0]?.service.barbershop

  return (
    <Card>
      <CardContent className="flex justify-between p-0">
        {/* div left */}
        <div className="flex min-w-0 flex-1 flex-col gap-2 py-5 pl-5">
          <Badge
            className="w-fit"
            variant={isConfirmed ? "default" : "secondary"}
          >
            {isConfirmed ? "Confirmado" : "Finalizado"}
          </Badge>
          <h3 className="truncate font-semibold">
            {formatServiceNames(booking.services)}
          </h3>

          {barbershop && (
            <div className="flex min-w-0 items-center gap-2">
              <Avatar className="h-6 w-6 shrink-0">
                <AvatarImage src={barbershop.imageUrl} />
              </Avatar>
              <p className="truncate text-sm">{barbershop.name}</p>
            </div>
          )}

          <p className="text-muted-foreground truncate text-sm">
            com {booking.barber.name}
          </p>

          {isConfirmed && <CancelBookingDialog bookingId={booking.id} />}
        </div>
        {/* div right */}
        <div className="flex shrink-0 flex-col items-center justify-center border-l px-5 py-5">
          <p className="text-sm capitalize">
            {format(booking.date, "MMMM", { locale: ptBR })}
          </p>
          <p className="text-2xl">{format(booking.date, "dd")}</p>
          {/* Com vários serviços o início sozinho não diz quanto tempo o
              cliente vai ficar; a faixa diz. */}
          <p className="text-sm">{format(booking.date, "HH:mm")}</p>
          <p className="text-muted-foreground text-xs">
            até {formatBookingEnd(booking.date, booking.durationMinutes)}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

export default BookingItem
