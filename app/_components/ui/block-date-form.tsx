"use client"

import { useState, useTransition } from "react"
import { format, startOfToday } from "date-fns"
import { ptBR } from "date-fns/locale"
import { toast } from "sonner"
import {
  blockDate,
  type ConflictingBooking,
} from "@/app/admin/bloqueios/actions"
import { Button } from "./button"
import { Calendar } from "./calendar"
import { Input } from "./input"
import { Label } from "./label"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./dialog"

const BlockDateForm = () => {
  const [isPending, startTransition] = useTransition()
  const [selectedDay, setSelectedDay] = useState<Date | undefined>(undefined)
  const [reason, setReason] = useState("")
  const [conflicts, setConflicts] = useState<ConflictingBooking[] | null>(null)

  const resetForm = () => {
    setSelectedDay(undefined)
    setReason("")
  }

  const handleBlock = (confirmed?: boolean) => {
    if (!selectedDay) return

    startTransition(async () => {
      const result = await blockDate(selectedDay, reason, confirmed)

      if (!result.success) {
        if (result.needsConfirmation) {
          setConflicts(result.bookings)
          return
        }
        toast.error(result.message)
        return
      }

      setConflicts(null)
      resetForm()
      toast.success("Dia bloqueado com sucesso!")
    })
  }

  return (
    <div className="space-y-4">
      <div className="bg-card rounded-lg border">
        <Calendar
          mode="single"
          locale={ptBR}
          selected={selectedDay}
          onSelect={setSelectedDay}
          disabled={{ before: startOfToday() }}
          styles={{
            head_cell: {
              width: "100%",
              textTransform: "capitalize",
            },
            cell: {
              width: "100%",
            },
            button: {
              width: "100%",
            },
            nav_button_previous: {
              width: "32px",
              height: "32px",
            },
            nav_button_next: {
              width: "32px",
              height: "32px",
            },
            caption: {
              textTransform: "capitalize",
            },
          }}
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="block-reason">Motivo (opcional)</Label>
        <Input
          id="block-reason"
          placeholder="Ex.: Feriado, Compromisso pessoal"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />
      </div>

      <Button
        className="w-full"
        onClick={() => handleBlock()}
        disabled={isPending || !selectedDay}
      >
        {isPending ? "Bloqueando..." : "Bloquear dia"}
      </Button>

      <Dialog
        open={conflicts !== null}
        onOpenChange={(open) => {
          if (!open) setConflicts(null)
        }}
      >
        <DialogContent className="w-[90%] rounded-lg">
          <DialogHeader>
            <DialogTitle>Agendamentos nesse dia</DialogTitle>
            <DialogDescription>
              {selectedDay &&
                `Existem ${conflicts?.length} agendamento(s) confirmado(s) em ${format(
                  selectedDay,
                  "dd 'de' MMMM",
                  { locale: ptBR },
                )}. Bloquear mesmo assim?`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            {conflicts?.map((booking) => (
              <div
                key={booking.id}
                className="bg-card flex items-center justify-between gap-3 rounded-lg border p-3"
              >
                <div>
                  <p className="text-sm font-semibold">{booking.clientName}</p>
                  <p className="text-muted-foreground text-sm">
                    {booking.serviceNames}
                  </p>
                </div>
                <p className="text-sm font-semibold">{booking.time}</p>
              </div>
            ))}
          </div>

          <p className="text-muted-foreground text-sm">
            Os agendamentos não serão cancelados. Avise os clientes por fora do
            sistema.
          </p>

          <DialogFooter className="grid grid-cols-2 gap-3">
            <DialogClose asChild>
              <Button
                variant="secondary"
                className="w-full"
                disabled={isPending}
              >
                Voltar
              </Button>
            </DialogClose>
            <Button
              className="w-full"
              onClick={() => handleBlock(true)}
              disabled={isPending}
            >
              {isPending ? "Bloqueando..." : "Bloquear mesmo assim"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default BlockDateForm
