import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { db } from "@/app/_lib/prisma"
import { fromDateOnly } from "@/app/_lib/date-only"
import BlockDateForm from "@/app/_components/ui/block-date-form"
import SyncHolidaysButton from "@/app/_components/ui/sync-holidays-button"
import UnblockDateButton from "@/app/_components/ui/unblock-date-button"

const AdminBloqueiosPage = async () => {
  const blockedDates = await db.blockedDate.findMany({
    orderBy: {
      date: "asc",
    },
  })

  return (
    <div className="space-y-6 p-5">
      <h1 className="text-xl font-bold">Bloquear dias</h1>

      <BlockDateForm />

      <div className="space-y-2">
        <h2 className="text-muted-foreground text-xs font-bold uppercase">
          Feriados nacionais
        </h2>
        <p className="text-muted-foreground text-sm">
          Bloqueia de uma vez os feriados nacionais deste ano e do próximo.
          Feriados de dezembro não entram e continuam sendo decisão sua.
        </p>
        <SyncHolidaysButton />
      </div>

      <div className="space-y-3">
        <h2 className="text-muted-foreground text-xs font-bold uppercase">
          Dias bloqueados
        </h2>

        {blockedDates.length === 0 && (
          <p className="text-muted-foreground text-sm">Nenhum dia bloqueado.</p>
        )}

        {blockedDates.map((blockedDate) => (
          <div
            key={blockedDate.id}
            className="bg-card flex items-center justify-between gap-3 rounded-lg border p-3"
          >
            <div>
              <p className="text-sm font-semibold capitalize">
                {format(
                  fromDateOnly(blockedDate.date),
                  "dd 'de' MMMM 'de' yyyy",
                  {
                    locale: ptBR,
                  },
                )}
              </p>
              <p className="text-muted-foreground text-sm">
                {blockedDate.reason ?? "Sem motivo informado"}
              </p>
            </div>

            <UnblockDateButton blockedDateId={blockedDate.id} />
          </div>
        ))}
      </div>
    </div>
  )
}

export default AdminBloqueiosPage
