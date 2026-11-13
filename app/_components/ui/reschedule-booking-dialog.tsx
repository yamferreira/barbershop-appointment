"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { rescheduleBooking } from "@/app/admin/agendamentos/actions"
import { formatInBarbershopTz } from "@/app/_lib/timezone"
import { Button } from "./button"
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
  DialogTrigger,
} from "./dialog"

interface RescheduleBookingDialogProps {
  bookingId: string
  currentDate: Date
}

const RescheduleBookingDialog = ({
  bookingId,
  currentDate,
}: RescheduleBookingDialogProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  // Data e hora de parede em São Paulo, iguais no servidor (que renderiza o
  // HTML inicial) e no navegador, seja qual for o fuso de cada um.
  const [date, setDate] = useState(
    formatInBarbershopTz(currentDate, "yyyy-MM-dd"),
  )
  const [time, setTime] = useState(formatInBarbershopTz(currentDate, "HH:mm"))
  const [error, setError] = useState<string | null>(null)

  const handleReschedule = () => {
    setError(null)
    startTransition(async () => {
      // O dia vai como texto: o servidor monta o instante em São Paulo.
      const result = await rescheduleBooking(bookingId, date, time)

      if (!result.success) {
        setError(result.message)
        toast.error(result.message)
        return
      }

      toast.success("Agendamento reagendado com sucesso!")
      setIsDialogOpen(false)
    })
  }

  return (
    <Dialog
      open={isDialogOpen}
      onOpenChange={(open) => {
        setIsDialogOpen(open)
        if (open) {
          setDate(formatInBarbershopTz(currentDate, "yyyy-MM-dd"))
          setTime(formatInBarbershopTz(currentDate, "HH:mm"))
          setError(null)
        }
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          Reagendar
        </Button>
      </DialogTrigger>

      <DialogContent className="w-[90%] rounded-lg">
        <DialogHeader>
          <DialogTitle>Reagendar</DialogTitle>
          <DialogDescription>
            Escolha a nova data e horário para esse agendamento.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="reschedule-date">Data</Label>
            <Input
              id="reschedule-date"
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="reschedule-time">Horário</Label>
            <Input
              id="reschedule-time"
              type="time"
              value={time}
              onChange={(event) => setTime(event.target.value)}
            />
          </div>
        </div>

        {error && <p className="text-destructive text-sm">{error}</p>}

        <DialogFooter className="grid grid-cols-2 gap-3">
          <DialogClose asChild>
            <Button variant="secondary" className="w-full" disabled={isPending}>
              Voltar
            </Button>
          </DialogClose>
          <Button
            className="w-full"
            onClick={handleReschedule}
            disabled={isPending || !date || !time}
          >
            {isPending ? "Salvando..." : "Confirmar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default RescheduleBookingDialog
