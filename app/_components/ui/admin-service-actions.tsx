"use client"

import { useState, useTransition } from "react"
import { ArrowDownIcon, ArrowUpIcon } from "lucide-react"
import { toast } from "sonner"
import {
  deleteService,
  moveService,
  setServiceActive,
} from "@/app/admin/servicos/actions"
import { Button } from "./button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./dialog"

interface AdminServiceActionsProps {
  serviceId: string
  serviceName: string
  active: boolean
  isFirst: boolean
  isLast: boolean
  /** Só sem nenhum agendamento; o servidor confere de novo. */
  canDelete: boolean
}

type Result = { success: true } | { success: false; message: string }

const AdminServiceActions = ({
  serviceId,
  serviceName,
  active,
  isFirst,
  isLast,
  canDelete,
}: AdminServiceActionsProps) => {
  const [isPending, startTransition] = useTransition()
  const [confirmDelete, setConfirmDelete] = useState(false)

  const run = (action: () => Promise<Result>, successMessage?: string) => {
    startTransition(async () => {
      const result = await action()
      if (!result.success) {
        toast.error(result.message)
        return
      }
      if (successMessage) toast.success(successMessage)
    })
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        size="icon"
        variant="outline"
        className="size-8"
        aria-label={`Subir ${serviceName}`}
        disabled={isPending || isFirst}
        onClick={() => run(() => moveService(serviceId, "up"))}
      >
        <ArrowUpIcon />
      </Button>
      <Button
        size="icon"
        variant="outline"
        className="size-8"
        aria-label={`Descer ${serviceName}`}
        disabled={isPending || isLast}
        onClick={() => run(() => moveService(serviceId, "down"))}
      >
        <ArrowDownIcon />
      </Button>
      <Button
        size="sm"
        variant="outline"
        disabled={isPending}
        onClick={() =>
          run(
            () => setServiceActive(serviceId, !active),
            active
              ? "Serviço desativado. Não aparece mais para os clientes."
              : "Serviço ativado!",
          )
        }
      >
        {active ? "Desativar" : "Ativar"}
      </Button>

      {canDelete && (
        <>
          <Button
            size="sm"
            variant="outline"
            className="text-destructive hover:text-destructive"
            disabled={isPending}
            onClick={() => setConfirmDelete(true)}
          >
            Apagar
          </Button>

          <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
            <DialogContent className="w-[90%] rounded-lg">
              <DialogHeader>
                <DialogTitle>Apagar serviço</DialogTitle>
                <DialogDescription>
                  Apagar “{serviceName}” de vez? Isso não pode ser desfeito.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="grid grid-cols-2 gap-3">
                <DialogClose asChild>
                  <Button variant="secondary" disabled={isPending}>
                    Voltar
                  </Button>
                </DialogClose>
                <Button
                  variant="destructive"
                  disabled={isPending}
                  onClick={() =>
                    startTransition(async () => {
                      const result = await deleteService(serviceId)
                      if (!result.success) {
                        toast.error(result.message)
                        return
                      }
                      setConfirmDelete(false)
                      toast.success("Serviço apagado!")
                    })
                  }
                >
                  {isPending ? "Apagando..." : "Apagar"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  )
}

export default AdminServiceActions
