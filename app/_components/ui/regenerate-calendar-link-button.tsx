"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { regenerateCalendarToken } from "@/app/admin/calendario/actions"
import { Button } from "./button"
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

interface RegenerateCalendarLinkButtonProps {
  barberId: string
  barberName: string
}

const RegenerateCalendarLinkButton = ({
  barberId,
  barberName,
}: RegenerateCalendarLinkButtonProps) => {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const handleConfirm = () => {
    startTransition(async () => {
      const result = await regenerateCalendarToken(barberId)
      if (!result.success) {
        toast.error(result.message)
        return
      }
      setOpen(false)
      toast.success("Novo link gerado. O anterior não funciona mais.")
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" size="sm" variant="outline">
          Gerar novo link
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[90%] rounded-lg">
        <DialogHeader>
          <DialogTitle>Gerar novo link do {barberName}?</DialogTitle>
          <DialogDescription>
            O link atual para de funcionar na hora. Todo calendário que assinou
            o link antigo deixa de atualizar e precisa ser assinado de novo com
            o link novo. Use isto se o link vazou.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="grid grid-cols-2 gap-3">
          <DialogClose asChild>
            <Button variant="secondary" className="w-full" disabled={isPending}>
              Voltar
            </Button>
          </DialogClose>
          <Button
            variant="destructive"
            className="w-full"
            onClick={handleConfirm}
            disabled={isPending}
          >
            {isPending ? "Gerando..." : "Gerar novo link"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default RegenerateCalendarLinkButton
