import { redirect } from "next/navigation"
import { auth } from "@/app/_lib/auth-config"
import Header from "@/app/_components/ui/header"
import BookingItem from "@/app/_components/ui/booking-item"
import {
  getConfirmedBookings,
  getFinishedBookings,
} from "@/app/_actions/get-bookings"

const BookingsPage = async () => {
  const session = await auth()

  if (!session?.user) {
    return redirect("/")
  }

  const confirmedBookings = await getConfirmedBookings(
    session.user.id as string,
  )
  const finishedBookings = await getFinishedBookings(session.user.id as string)

  return (
    <div className="flex min-h-full flex-col">
      <Header />

      <div className="theme-nobre bg-background text-foreground flex flex-1 flex-col space-y-6 p-5">
        <h1 className="text-xl font-bold">Agendamentos</h1>

        {confirmedBookings.length === 0 && finishedBookings.length === 0 && (
          <p className="text-muted-foreground text-sm">
            Você ainda não tem agendamentos.
          </p>
        )}

        {confirmedBookings.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-muted-foreground text-xs font-bold uppercase">
              Confirmados
            </h2>
            {confirmedBookings.map((booking) => (
              <BookingItem key={booking.id} booking={booking} />
            ))}
          </div>
        )}

        {finishedBookings.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-muted-foreground text-xs font-bold uppercase">
              Finalizados
            </h2>
            {finishedBookings.map((booking) => (
              <BookingItem key={booking.id} booking={booking} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default BookingsPage
