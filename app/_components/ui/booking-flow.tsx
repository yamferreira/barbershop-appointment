"use client"

import type {
  Barber,
  Barbershop,
  BarbershopService,
  BlockedDate,
  Booking,
} from "../../generated/prisma"
import Image from "next/image"
import { CheckIcon } from "lucide-react"
import { Button } from "./button"
import { Card, CardContent } from "./card"
import BookingCalendar from "./booking-calendar"
import { Input } from "./input"
import { Label } from "./label"
import { ptBR } from "date-fns/locale"
import { useEffect, useMemo, useState } from "react"
import { format, isSameDay, set, startOfToday } from "date-fns"
import { useSession } from "next-auth/react"
import { createBooking } from "@/app/_actions/create-booking"
import { fromDateOnly } from "@/app/_lib/date-only"
import { isValidPhone, maskPhone, normalizePhone } from "@/app/_lib/phone"
import { getBlockedDates } from "@/app/_actions/get-blocked-dates"
import { getBookings } from "@/app/_actions/get-bookings"
import {
  formatDuration,
  getBookingEnd,
  getClosingTime,
  intervalsOverlap,
} from "@/app/_lib/schedule"
import { cn } from "@/app/_lib/utils"
import { toast } from "sonner"

type ServiceWithNumberPrice = Omit<BarbershopService, "price"> & {
  price: number
}

/** O que `getBookings` entrega: só o intervalo ocupado, sem dados do cliente. */
type DayBooking = Pick<Booking, "barberId" | "date" | "durationMinutes">

/** O que `getBlockedDates` entrega: só o dia e o barbeiro, sem o motivo. */
type DayBlock = Pick<BlockedDate, "date" | "barberId">

/** O que `getActiveBarbers` entrega: nunca o `calendarToken`. */
type BarberOption = Pick<Barber, "id" | "name">

/** Horário escolhido: o barbeiro vem junto, porque cada seção tem o seu. */
interface SelectedSlot {
  barberId: string
  time: string
}

interface BookingFlowProps {
  services: ServiceWithNumberPrice[]
  barbershop: Pick<Barbershop, "name">
  barbers: BarberOption[]
  /**
   * Telefone (só dígitos) do último agendamento do usuário logado, para
   * pré-preencher o campo. Continua editável.
   */
  defaultPhone?: string | null
}

const TIME_LIST = [
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
  "18:00",
]

const formatPrice = (price: number) =>
  Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    price,
  )

const BookingFlow = ({
  services,
  barbershop,
  barbers,
  defaultPhone,
}: BookingFlowProps) => {
  const { data } = useSession()
  const [selectedServiceIds, setSelectedServiceIds] = useState<Set<string>>(
    new Set(),
  )
  const [showBookingDetails, setShowBookingDetails] = useState(false)
  const [selectedDay, setSelectedDay] = useState<Date | undefined>(undefined)
  const [selectedSlot, setSelectedSlot] = useState<SelectedSlot | undefined>(
    undefined,
  )
  const [dayBookings, setDayBookings] = useState<DayBooking[]>([])
  const [blockedDates, setBlockedDates] = useState<DayBlock[]>([])
  const [guestName, setGuestName] = useState("")
  // Guardado já com máscara, que é o que o campo mostra. A validação e o envio
  // usam os dígitos.
  const [phone, setPhone] = useState(() =>
    defaultPhone ? maskPhone(defaultPhone) : "",
  )
  // Recusa do servidor que não tem a ver com o horário (limite de
  // agendamentos do telefone). Fica visível acima do Confirmar, além do toast,
  // e some quando o cliente troca o telefone.
  const [submitError, setSubmitError] = useState<string | null>(null)

  const isGuest = !data?.user
  const phoneDigits = normalizePhone(phone)
  const isPhoneValid = isValidPhone(phoneDigits)
  // Só acusa erro depois que o número parece completo, para não brigar com
  // quem ainda está digitando.
  const showPhoneError = phoneDigits.length >= 10 && !isPhoneValid

  const selectedServices = services.filter((service) =>
    selectedServiceIds.has(service.id),
  )
  const totalDurationMinutes = selectedServices.reduce(
    (sum, service) => sum + service.durationMinutes,
    0,
  )
  const totalPrice = selectedServices.reduce(
    (sum, service) => sum + service.price,
    0,
  )
  const selectedServicesLabel = selectedServices
    .map((service) => service.name)
    .join(" + ")

  useEffect(() => {
    getBlockedDates().then(setBlockedDates)
  }, [])

  useEffect(() => {
    if (!selectedDay) return
    getBookings({ date: selectedDay }).then(setDayBookings)
  }, [selectedDay])

  // Bloqueio sem barbeiro vale para a barbearia inteira; com barbeiro, só para
  // ele. O mesmo critério do servidor (`findBlockForBarber`).
  const isBlockedFor = (date: Date, barberId: string) =>
    blockedDates.some(
      (blocked) =>
        isSameDay(fromDateOnly(blocked.date), date) &&
        (blocked.barberId === null || blocked.barberId === barberId),
    )

  // O dia só some do calendário quando nenhum barbeiro pode atender nele. Se
  // só um estiver bloqueado, o dia continua e a seção dele avisa.
  const isDateDisabled = (date: Date) => {
    if (date < startOfToday()) return true
    if (date.getDay() === 0) return true
    return barbers.every((barber) => isBlockedFor(date, barber.id))
  }

  // Um horário só entra na lista de um barbeiro se o intervalo inteiro do novo
  // agendamento (início até início + duração total dos serviços marcados) couber
  // antes do fechamento e não colidir com nenhum agendamento ativo DELE no dia
  // — e cada um deles também ocupa um intervalo, não só o instante em que
  // começa. A agenda de cada barbeiro é independente: o Luiz ocupado às 14h não
  // tira o horário do TH.
  //
  // Isso é só conveniência de UX: a validação que vale é a do servidor, em
  // createBooking.
  const barberSlots = useMemo(() => {
    if (!selectedDay || totalDurationMinutes === 0) return []
    const closingTime = getClosingTime(selectedDay)

    return barbers.map((barber) => {
      const barberBookings = dayBookings.filter(
        (booking) => booking.barberId === barber.id,
      )
      const isBlocked = blockedDates.some(
        (blocked) =>
          isSameDay(fromDateOnly(blocked.date), selectedDay) &&
          (blocked.barberId === null || blocked.barberId === barber.id),
      )

      const times = isBlocked
        ? []
        : TIME_LIST.filter((time) => {
            const hour = Number(time.split(":")[0])
            const minutes = Number(time.split(":")[1])
            const start = set(selectedDay, {
              hours: hour,
              minutes,
              seconds: 0,
              milliseconds: 0,
            })
            const end = getBookingEnd(start, totalDurationMinutes)

            if (end > closingTime) return false

            return !barberBookings.some((booking) =>
              intervalsOverlap(
                start,
                end,
                booking.date,
                getBookingEnd(booking.date, booking.durationMinutes),
              ),
            )
          })

      return { barber, isBlocked, times }
    })
  }, [selectedDay, dayBookings, blockedDates, barbers, totalDurationMinutes])

  // Com um único barbeiro ativo não há escolha a fazer: os horários dele são os
  // horários da barbearia, sem título por barbeiro, e o barbeiro vai junto do
  // horário escolhido sem o cliente precisar saber quem é. Com mais de um, cada
  // um ganha a sua seção.
  const isSingleBarber = barbers.length === 1
  const hasAnySlot = barberSlots.some(({ times }) => times.length > 0)
  const selectedBarber = barbers.find(
    (barber) => barber.id === selectedSlot?.barberId,
  )

  const handleServiceToggle = (serviceId: string) => {
    setSelectedServiceIds((prev) => {
      const next = new Set(prev)
      if (next.has(serviceId)) {
        next.delete(serviceId)
      } else {
        next.add(serviceId)
      }
      return next
    })
    setShowBookingDetails(false)
    setSelectedDay(undefined)
    setSelectedSlot(undefined)
  }

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDay(date)
    setSelectedSlot(undefined)
  }

  // Escolher um horário em qualquer seção define também o barbeiro. Com um só
  // barbeiro a seção é uma só, então ele é selecionado automaticamente.
  const handleTimeSelect = (barberId: string, time: string) => {
    setSelectedSlot({ barberId, time })
  }

  const handleConfirmClick = async () => {
    if (!selectedDay || !selectedSlot || selectedServices.length === 0) return
    if (isGuest && !guestName.trim()) {
      toast.error("Informe seu nome para agendar.")
      return
    }
    if (!isPhoneValid) {
      toast.error("Informe um telefone válido com DDD.")
      return
    }

    setSubmitError(null)
    try {
      const hour = Number(selectedSlot.time.split(":")[0])
      const minutes = Number(selectedSlot.time.split(":")[1])
      const newDate = set(selectedDay, {
        minutes: minutes,
        hours: hour,
      })
      const result = await createBooking({
        serviceIds: selectedServices.map((service) => service.id),
        barberId: selectedSlot.barberId,
        date: newDate,
        phone: phoneDigits,
        ...(isGuest && { guestName: guestName.trim() }),
      })

      if (!result.success) {
        toast.error(result.message)
        // O horário continua válido: não adianta desmarcá-lo e travar o
        // Confirmar. O cliente cancela um agendamento ou troca o telefone e
        // tenta de novo com a mesma seleção.
        if ("code" in result && result.code === "BOOKING_LIMIT") {
          setSubmitError(result.message)
          return
        }
        setSelectedSlot(undefined)
        getBookings({ date: selectedDay }).then(setDayBookings)
        return
      }

      setSelectedDay(undefined)
      setSelectedSlot(undefined)
      toast.success("Reserva criada com sucesso!")
    } catch (error) {
      console.log(error)
      toast.error("Erro ao criar reserva!")
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid max-h-[420px] grid-cols-2 gap-3 overflow-y-auto pr-1 sm:grid-cols-3">
        {services.map((service) => {
          const isSelected = selectedServiceIds.has(service.id)
          return (
            <button
              key={service.id}
              type="button"
              aria-pressed={isSelected}
              onClick={() => handleServiceToggle(service.id)}
              className={cn(
                "relative flex flex-col items-center gap-2 rounded-xl border p-3 text-center transition-colors",
                isSelected
                  ? "border-[var(--brand-gold)] bg-[var(--brand-gold)]/10"
                  : "bg-secondary hover:border-border border-transparent",
              )}
            >
              {isSelected && (
                <span className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--brand-gold)] text-[#2a2620]">
                  <CheckIcon className="h-3 w-3" />
                </span>
              )}
              <div className="relative h-14 w-14">
                <Image
                  src={service.imageUrl}
                  alt={service.name}
                  fill
                  className="rounded-lg object-cover"
                />
              </div>
              <p className="text-xs font-semibold">{service.name}</p>
              <p className="text-xs font-bold text-[var(--brand-gold-text)]">
                {formatPrice(service.price)}
              </p>
            </button>
          )
        })}
      </div>

      {selectedServices.length > 0 && (
        <p className="text-muted-foreground text-sm">
          {selectedServicesLabel} = {formatDuration(totalDurationMinutes)}
        </p>
      )}

      {!showBookingDetails && (
        <Button
          className="w-full"
          disabled={selectedServices.length === 0}
          onClick={() => setShowBookingDetails(true)}
        >
          Continuar
        </Button>
      )}

      {selectedServices.length > 0 && showBookingDetails && (
        <Card>
          <CardContent className="space-y-5 p-5">
            <div>
              <h3 className="font-semibold">{selectedServicesLabel}</h3>
              <p className="text-muted-foreground text-sm">
                {formatDuration(totalDurationMinutes)}
              </p>
            </div>

            <BookingCalendar
              selected={selectedDay}
              onSelect={handleDateSelect}
              disabled={isDateDisabled}
            />

            {selectedDay &&
              barberSlots.map(({ barber, isBlocked, times }) => (
                <div key={barber.id} className="space-y-3">
                  {!isSingleBarber && (
                    <h4 className="text-sm font-semibold">
                      Horário do {barber.name}
                    </h4>
                  )}

                  {times.length > 0 ? (
                    <div className="flex gap-3 overflow-x-auto [&::-webkit-scrollbar]:hidden">
                      {times.map((time) => (
                        <Button
                          key={time}
                          variant={
                            selectedSlot?.barberId === barber.id &&
                            selectedSlot.time === time
                              ? "default"
                              : "outline"
                          }
                          className="rounded-full"
                          onClick={() => handleTimeSelect(barber.id, time)}
                        >
                          {time}
                        </Button>
                      ))}
                    </div>
                  ) : (
                    // Com um barbeiro só, o aviso geral logo abaixo já diz
                    // que não há horário; repetir aqui seria a mesma frase duas
                    // vezes.
                    !isSingleBarber && (
                      <p className="text-muted-foreground text-sm">
                        {isBlocked
                          ? `${barber.name} não atende nesse dia.`
                          : "Sem horários livres nessa data."}
                      </p>
                    )
                  )}
                </div>
              ))}

            {selectedDay && barbers.length > 0 && !hasAnySlot && (
              <p className="text-muted-foreground text-sm">
                Nenhum horário disponível para essa data.
              </p>
            )}

            {barbers.length === 0 && (
              <p className="text-muted-foreground text-sm">
                Nenhum barbeiro disponível no momento.
              </p>
            )}

            {selectedSlot && selectedDay && (
              <Card>
                <CardContent className="space-y-3 p-3">
                  <div className="flex items-center justify-between">
                    <h2 className="font-bold">{selectedServicesLabel}</h2>
                    <p className="text-sm font-bold">
                      {formatPrice(totalPrice)}
                    </p>
                  </div>

                  <div className="flex items-center justify-between">
                    <h2 className="text-muted-foreground text-sm">Data</h2>
                    <p className="text-sm">
                      {format(selectedDay, "d 'de' MMMM", { locale: ptBR })}
                    </p>
                  </div>

                  <div className="flex items-center justify-between">
                    <h2 className="text-muted-foreground text-sm">Horário</h2>
                    <p className="text-sm">{selectedSlot?.time}</p>
                  </div>

                  {!isSingleBarber && (
                    <div className="flex items-center justify-between">
                      <h2 className="text-muted-foreground text-sm">
                        Barbeiro
                      </h2>
                      <p className="text-sm">{selectedBarber?.name}</p>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <h2 className="text-muted-foreground text-sm">Barbearia</h2>
                    <p className="text-sm">{barbershop.name}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {selectedSlot && selectedDay && (
              <div className="space-y-3">
                {isGuest && (
                  <div className="space-y-1">
                    <Label htmlFor="guest-name">Nome</Label>
                    <Input
                      id="guest-name"
                      placeholder="Seu nome"
                      autoComplete="name"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                    />
                  </div>
                )}
                {/* Obrigatório para todos, com ou sem login. */}
                <div className="space-y-1">
                  <Label htmlFor="booking-phone">Telefone (WhatsApp)</Label>
                  <Input
                    id="booking-phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel-national"
                    placeholder="(11) 91234-5678"
                    required
                    aria-invalid={showPhoneError || undefined}
                    aria-describedby={
                      showPhoneError ? "booking-phone-error" : undefined
                    }
                    value={phone}
                    onChange={(e) => {
                      setPhone(maskPhone(e.target.value))
                      setSubmitError(null)
                    }}
                  />
                  {showPhoneError && (
                    <p
                      id="booking-phone-error"
                      className="text-destructive text-xs"
                    >
                      Confira o DDD e o número. Celular tem 9 dígitos e começa
                      com 9.
                    </p>
                  )}
                </div>
              </div>
            )}

            {submitError && selectedSlot && (
              <p role="alert" className="text-destructive text-sm">
                {submitError}
              </p>
            )}

            <Button
              className="w-full"
              onClick={handleConfirmClick}
              disabled={
                !selectedSlot ||
                !selectedDay ||
                (isGuest && !guestName.trim()) ||
                !isPhoneValid
              }
            >
              Confirmar
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default BookingFlow
