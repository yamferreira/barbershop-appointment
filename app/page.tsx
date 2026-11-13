import Header from "./_components/ui/header"
import { db } from "./_lib/prisma"
import BookingItem from "./_components/ui/booking-item"
import BookingFlow from "./_components/ui/booking-flow"
import { auth } from "./_lib/auth-config"
import { getConfirmedBookings } from "./_lib/user-bookings"
import { getActiveBarbers } from "./_actions/get-barbers"
import { getLastBookingPhone } from "./_lib/last-booking-phone"
import { formatInBarbershopTz } from "./_lib/timezone"

const Home = async () => {
  const session = await auth()
  const barbershop = await db.barbershop.findFirst({
    // O cliente só vê o que o barbeiro deixou ativo, na ordem que ele definiu.
    include: {
      services: { where: { active: true }, orderBy: { position: "asc" } },
    },
  })
  const barbers = await getActiveBarbers()
  // Ambas leem o usuário da sessão; sem login, voltam vazias.
  const confirmedBookings = await getConfirmedBookings()
  const lastPhone = await getLastBookingPhone()
  const firstName = session?.user?.name?.split(" ")[0]
  // Data de hoje em São Paulo: no servidor em UTC, depois das 21h já seria
  // amanhã.
  const today = formatInBarbershopTz(new Date(), "EEEE, dd 'de' MMMM")
  const capitalizedToday = today.charAt(0).toUpperCase() + today.slice(1)

  const services = barbershop
    ? barbershop.services.map((service) => ({
        ...service,
        price: Number(service.price),
      }))
    : []

  return (
    <div className="flex flex-1 flex-col">
      <Header />
      <div className="bg-[var(--brand-forest)] px-5 pt-6 pb-8">
        <h2 className="font-display text-3xl font-bold text-[var(--brand-cream)]">
          Olá{firstName ? `, ${firstName}` : ""}!
        </h2>
        <p className="text-sm text-[var(--brand-cream)]/70">
          {barbershop ? `${barbershop.name} · ` : ""}
          {capitalizedToday}.
        </p>
      </div>

      <div className="theme-nobre bg-background text-foreground flex flex-1 flex-col px-5 py-5">
        {confirmedBookings.length > 0 && (
          <div className="pb-6">
            <h2 className="text-muted-foreground mb-3 text-xs font-bold uppercase">
              Agendamentos
            </h2>
            <div className="space-y-3">
              {confirmedBookings.map((booking) => (
                <BookingItem
                  key={booking.id}
                  booking={booking}
                  showBarber={barbers.length > 1}
                />
              ))}
            </div>
          </div>
        )}

        <div className="flex-1">
          <h2 className="text-muted-foreground mb-3 text-xs font-bold uppercase">
            Novo agendamento
          </h2>
          {barbershop ? (
            <BookingFlow
              services={services}
              barbershop={{ name: barbershop.name }}
              barbers={barbers}
              defaultPhone={lastPhone}
            />
          ) : (
            <p className="text-muted-foreground text-sm">
              Nenhuma barbearia cadastrada ainda.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export default Home
